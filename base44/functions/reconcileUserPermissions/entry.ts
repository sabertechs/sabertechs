import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getEmployeePermissionData, needsSync } from "../../shared/userPermissionSync.ts";

/**
 * Daily safety-net reconciliation: scans Employee records in batches and
 * syncs any User.data permission fields that drifted from the Employee source
 * of truth.
 *
 * Called by the "Daily Permission Reconciliation" scheduled workflow.
 * Catches cases that fall through the entity/auth trigger cracks:
 * - Bulk SDK updates that bypass the entity trigger
 * - Users who registered before their Employee record was created
 * - Any data corruption or manual database edits
 *
 * Time-budgeted: processes in batches of 50 with 800ms delays, targeting
 * completion within the function timeout. If it can't finish all employees in
 * one run, it processes as many as it can and reports has_more=true — the
 * next daily run picks up where it left off (sorted by -created_date so the
 * oldest un-synced records are processed first on subsequent runs).
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const startSkip = body.start_skip || 0;
    const BATCH_SIZE = 50;
    const TIME_BUDGET_MS = 25000; // 25-second self-imposed budget
    const startTime = Date.now();

    let skip = startSkip;
    let synced = 0;
    let alreadyInSync = 0;
    let noUserAccount = 0;
    let totalProcessed = 0;
    let hasMore = false;

    while (Date.now() - startTime < TIME_BUDGET_MS) {
      // Load a batch of employees
      const empBatch = await base44.asServiceRole.entities.Employee.filter(
        {},
        "-created_date",
        BATCH_SIZE,
        skip
      );

      if (empBatch.length === 0) break;

      // Build email → permission data map for this batch
      const empMap = {};
      const batchEmails = [];
      for (const emp of empBatch) {
        const email = emp.email?.toString().trim().toLowerCase();
        if (email) {
          empMap[email] = getEmployeePermissionData(emp);
          batchEmails.push(email);
        }
      }

      // Look up users for this batch
      if (batchEmails.length > 0) {
        const users = await base44.asServiceRole.entities.User.filter({
          email: { $in: batchEmails },
        });

        const toUpdate = [];
        for (const user of users) {
          const email = user.email?.toString().trim().toLowerCase();
          const empData = empMap[email];
          if (!empData) continue;

          if (needsSync(user.data, empData)) {
            const newData = { ...(user.data || {}), ...empData };
            toUpdate.push({ id: user.id, data: newData });
          } else {
            alreadyInSync++;
          }
        }
        noUserAccount += batchEmails.length - users.length;

        // Bulk update mismatched users in this batch
        if (toUpdate.length > 0) {
          await base44.asServiceRole.entities.User.bulkUpdate(toUpdate);
          synced += toUpdate.length;
        }
      }

      totalProcessed += empBatch.length;
      skip += empBatch.length;

      // Check if there are more employees to process
      if (empBatch.length < BATCH_SIZE) {
        hasMore = false;
        break;
      }
      hasMore = true;

      // Delay between batches to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return Response.json({
      success: true,
      start_skip: startSkip,
      processed: totalProcessed,
      synced,
      already_in_sync: alreadyInSync,
      no_user_account: noUserAccount,
      has_more: hasMore,
      next_skip: skip,
      elapsed_ms: Date.now() - startTime,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
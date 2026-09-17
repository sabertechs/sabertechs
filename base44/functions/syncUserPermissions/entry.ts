import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { syncUserFromEmployee } from "../../shared/userPermissionSync.ts";

/**
 * Syncs Employee permission data (designation, employment_type, department)
 * to the matching platform User's data object.
 *
 * Called by two workflows:
 * 1. "Sync Employee Permissions" — entity trigger on Employee create/update
 *    (args: { email } from .trigger.data.email)
 * 2. "Sync User on Auth" — app_user_auth trigger on login/signup
 *    (args: { email } from .trigger.email)
 *
 * This is the SINGLE function that keeps User.data consistent with Employee
 * records. Idempotent — only writes on mismatch.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = body.email;

    const result = await syncUserFromEmployee(base44, email);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
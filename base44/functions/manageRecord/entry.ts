import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';
import { getPermission, getOwnershipField } from '../../shared/entityPermissions.ts';

/**
 * Generic authorized CRUD endpoint for protected entities.
 *
 * Frontend → manageRecord → can(permissionKey) → database (asServiceRole).
 *
 * Payload:
 *   { entity, action, id?, data?, ids?, filter?, context? }
 *
 * action: 'create' | 'update' | 'delete' | 'bulkUpdate' | 'bulkDelete'
 * context: 'self' for self-service operations (uses self-service permissions +
 *          verifies record ownership).
 *
 * RLS remains the data-scope safety layer; this function is the permission
 * authority. Uses asServiceRole to bypass RLS (permission already verified).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { entity, action, id, data, ids, filter, context } = body;

    if (!entity || !action) {
      return Response.json({ error: 'Missing entity or action' }, { status: 400 });
    }

    const validActions = ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete'];
    if (!validActions.includes(action)) {
      return Response.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    // Map bulk actions to base action for permission lookup
    const baseAction = (action.startsWith('bulk') ? action.replace('bulk', '').toLowerCase() : action) as 'create' | 'update' | 'delete';
    let permission = getPermission(entity, baseAction, context);

    // Freelancer bulk-upload creates Employee records with employment_type=contractual.
    // Authorize these with 'freelancers.manage' (the FreelancerUpload page permission)
    // instead of 'hr.employees.manage', so users who can access the page can actually
    // create the records.
    if (entity === 'Employee' && baseAction === 'create') {
      const records = Array.isArray(data) ? data : [data];
      if (records.some((r: any) => r?.employment_type === 'contractual')) {
        permission = 'freelancers.manage';
      }
    }

    // undefined = entity not in permission map at all
    if (permission === undefined) {
      return Response.json({ error: `Entity ${entity} not supported by manageRecord` }, { status: 400 });
    }

    // null = any authenticated user (self-service). Non-null = require permission.
    if (permission !== null) {
      if (!(await can(base44, user, permission))) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Self-service ownership verification
    const ownershipField = context === 'self' ? getOwnershipField(entity) : undefined;
    const entityApi = base44.asServiceRole.entities[entity];
    if (!entityApi) {
      return Response.json({ error: `Unknown entity: ${entity}` }, { status: 400 });
    }

    // For self-service create, verify the ownership field matches the user
    if (ownershipField && action === 'create' && data) {
      if (data[ownershipField] !== user.email) {
        return Response.json({ error: 'You can only create records for yourself' }, { status: 403 });
      }
    }

    // For self-service update/delete, fetch the record and verify ownership
    if (ownershipField && (action === 'update' || action === 'delete') && id) {
      const record = await entityApi.get(id);
      if (record[ownershipField] !== user.email) {
        return Response.json({ error: 'You can only modify your own records' }, { status: 403 });
      }
    }

    // Perform the operation via asServiceRole (permission already verified)
    let result;
    switch (action) {
      case 'create':
        result = await entityApi.create(data);
        break;
      case 'update':
        result = await entityApi.update(id, data);
        break;
      case 'delete':
        result = await entityApi.delete(id);
        break;
      case 'bulkCreate':
        if (!data || !Array.isArray(data)) {
          return Response.json({ error: 'data array required for bulkCreate' }, { status: 400 });
        }
        result = await entityApi.bulkCreate(data);
        break;
      case 'bulkUpdate':
        // ids + data: apply same data to all ids
        if (!ids || !Array.isArray(ids)) {
          return Response.json({ error: 'ids array required for bulkUpdate' }, { status: 400 });
        }
        const updates = ids.map((rid: string) => ({ id: rid, ...data }));
        result = await entityApi.bulkUpdate(updates);
        break;
      case 'bulkDelete':
        if (ids && Array.isArray(ids)) {
          result = await entityApi.deleteMany({ id: { $in: ids } });
        } else if (filter) {
          result = await entityApi.deleteMany(filter);
        } else {
          return Response.json({ error: 'ids or filter required for bulkDelete' }, { status: 400 });
        }
        break;
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('manageRecord error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
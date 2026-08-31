import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await can(base44, user, 'projects.view'))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const projects = await base44.asServiceRole.entities.Project.list('-created_date', 5000);
    return Response.json({ projects });
  } catch (error) {
    console.error('listProjects error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});

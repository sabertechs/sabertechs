import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { can } from '../../shared/permissions.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body?.action;
    const data = body?.data || {};
    const id = body?.id;

    const permissionByAction: Record<string, string> = {
      create: 'projects.create',
      update: 'projects.edit',
      delete: 'projects.delete',
    };
    const permission = permissionByAction[action];
    if (!permission || !(await can(base44, user, permission))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'create') {
      const allProjects = await base44.asServiceRole.entities.Project.list('-created_date', 5000);
      const maxCode = allProjects.reduce((max: number, project: any) => {
        const n = project.project_code ? parseInt(String(project.project_code).replace('PRJ-', ''), 10) : 0;
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);
      const project = await base44.asServiceRole.entities.Project.create({
        ...data,
        project_code: `PRJ-${String(maxCode + 1).padStart(3, '0')}`,
      });
      return Response.json({ project });
    }

    if (!id) return Response.json({ error: 'Project id is required' }, { status: 400 });
    if (action === 'update') {
      const project = await base44.asServiceRole.entities.Project.update(id, data);
      return Response.json({ project });
    }
    if (action === 'delete') {
      await base44.asServiceRole.entities.Project.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('manageProject error:', error?.message || error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});

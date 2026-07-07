import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, project_name } = await req.json();

    // Look up project name if not provided
    let projectName = project_name || 'Unassigned Project';
    if (!project_name && project_id) {
      try {
        const project = await base44.asServiceRole.entities.Project.get(project_id);
        if (project?.name) projectName = project.name;
      } catch { /* use default */ }
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Helper: find or create a folder by name within a parent
    const findOrCreateFolder = async (name, parentId) => {
      const query = parentId
        ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

      const body = { name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) body.parents = [parentId];
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const folderData = await createRes.json();
      return folderData.id;
    };

    const rootFolderId = await findOrCreateFolder('SaberTechs Project Submissions', null);
    const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
    const projectFolderId = await findOrCreateFolder(safeProjectName, rootFolderId);
    const folderUrl = `https://drive.google.com/drive/folders/${projectFolderId}`;

    return Response.json({ success: true, folder_url: folderUrl, folder_id: projectFolderId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
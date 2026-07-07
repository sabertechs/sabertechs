import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, project_id, project_name, freelancer_name, task_title, file_name } = await req.json();

    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

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

    // Create/find root folder → project subfolder
    const rootFolderId = await findOrCreateFolder('SaberTechs Project Submissions', null);
    // Sanitize project name for folder
    const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
    const projectFolderId = await findOrCreateFolder(safeProjectName, rootFolderId);

    // Download the file from Base44 storage
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) return Response.json({ error: 'Failed to download file from storage' }, { status: 502 });
    const arrayBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';

    // Build a descriptive filename
    const safeTask = (task_title || 'task').replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
    const safeFreelancer = (freelancer_name || 'freelancer').replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
    const ext = (file_name || '').split('.').pop() || (contentType.startsWith('image/') ? 'jpg' : 'bin');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const driveFileName = `${safeTask}_${safeFreelancer}_${timestamp}.${ext}`;

    // Multipart upload to Drive — binary-safe (don't decode file bytes as text)
    const boundary = 'foo_bar_baz';
    const metadata = { name: driveFileName, parents: [projectFolderId] };
    const bytes = new Uint8Array(arrayBuffer);
    const binaryBody = new Uint8Array(
      new TextEncoder().encode(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
      )
    );
    const closing = new TextEncoder().encode(`\r\n--${boundary}--`);
    const combined = new Uint8Array(binaryBody.length + bytes.length + closing.length);
    combined.set(binaryBody, 0);
    combined.set(bytes, binaryBody.length);
    combined.set(closing, binaryBody.length + bytes.length);

    const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: combined,
    });

    if (!driveRes.ok) {
      const err = await driveRes.text();
      return Response.json({ error: 'Google Drive upload failed', details: err }, { status: 500 });
    }

    const driveData = await driveRes.json();
    const driveUrl = `https://drive.google.com/file/d/${driveData.id}/view`;
    const folderUrl = `https://drive.google.com/drive/folders/${projectFolderId}`;

    return Response.json({
      success: true,
      drive_file_id: driveData.id,
      drive_url: driveUrl,
      folder_url: folderUrl,
      file_name: driveFileName,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const projectId = body.project_id || null; // if provided, backfill only that project

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // --- Helpers ---
    const findOrCreateFolder = async (name: string, parentId: string | null): Promise<string> => {
      const query = parentId
        ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const searchData = await searchRes.json();
      if (searchData.files?.length > 0) return searchData.files[0].id;

      const createBody: any = { name, mimeType: 'application/vnd.google-apps.folder' };
      if (parentId) createBody.parents = [parentId];
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      });
      const folderData = await createRes.json();
      return folderData.id;
    };

    const uploadFileToDrive = async (fileUrl: string, projectFolderId: string, fileName: string): Promise<boolean> => {
      try {
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) return false;
        const arrayBuffer = await fileRes.arrayBuffer();
        const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';

        const boundary = 'foo_bar_baz';
        const metadata = { name: fileName, parents: [projectFolderId] };
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
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: combined,
        });
        return driveRes.ok;
      } catch {
        return false;
      }
    };

    // --- Fetch file/image responses ---
    const filterQuery: any = { response_type: { $in: ['file', 'image'] } };
    if (projectId) filterQuery.project_id = projectId;

    const responses = await base44.asServiceRole.entities.TaskResponse.filter(filterQuery, '-submission_date', 500);

    // Cache: projectFolderId and project name per project
    const folderCache: Record<string, string> = {};
    const projectNameCache: Record<string, string> = {};
    const taskTitleCache: Record<string, string> = {};

    const rootFolderId = await findOrCreateFolder('SaberTechs Project Submissions', null);

    let totalFiles = 0;
    let uploaded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const resp of responses) {
      // Resolve project folder
      let projectFolderId = folderCache[resp.project_id];
      if (!projectFolderId) {
        let projectName = projectNameCache[resp.project_id];
        if (!projectName && resp.project_id) {
          try {
            const project = await base44.asServiceRole.entities.Project.get(resp.project_id);
            projectName = project?.name || 'Unassigned Project';
          } catch { projectName = 'Unassigned Project'; }
          projectNameCache[resp.project_id] = projectName;
        }
        const safeName = (projectName || 'Unassigned Project').replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
        projectFolderId = await findOrCreateFolder(safeName, rootFolderId);
        folderCache[resp.project_id] = projectFolderId;
      }

      // Resolve task title
      let taskTitle = taskTitleCache[resp.task_id];
      if (!taskTitle && resp.task_id) {
        try {
          const task = await base44.asServiceRole.entities.ProjectTask.get(resp.task_id);
          taskTitle = task?.title || 'task';
        } catch { taskTitle = 'task'; }
        taskTitleCache[resp.task_id] = taskTitle;
      }

      // Parse file URLs from response_value
      let fileUrls: string[] = [];
      try {
        const parsed = JSON.parse(resp.response_value);
        if (Array.isArray(parsed)) fileUrls = parsed.filter((u: any) => typeof u === 'string');
        else if (typeof parsed === 'string') fileUrls = [parsed];
      } catch {
        // Not JSON — treat as single URL
        if (resp.response_value?.startsWith('http')) fileUrls = [resp.response_value];
      }

      const safeTask = (taskTitle || 'task').replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);
      const safeFreelancer = (resp.freelancer_name || 'freelancer').replace(/[\\/:*?"<>|]/g, '_').slice(0, 50);

      for (let i = 0; i < fileUrls.length; i++) {
        totalFiles++;
        const url = fileUrls[i];
        const ext = url.split('.').pop()?.split('?')[0] || 'bin';
        const fileName = `${safeTask}_${safeFreelancer}_${i + 1}.${ext}`;
        const ok = await uploadFileToDrive(url, projectFolderId, fileName);
        if (ok) uploaded++;
        else { failed++; errors.push(`${fileName} (${url.slice(0, 60)})`); }
      }
    }

    return Response.json({
      success: true,
      responses_scanned: responses.length,
      total_files: totalFiles,
      uploaded,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
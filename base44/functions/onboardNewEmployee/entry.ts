import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Support both direct call and entity automation payload
    const employeeId = payload?.employee_id || payload?.event?.entity_id || payload?.data?.id;
    const employeeData = payload?.data || null;

    if (!employeeId && !employeeData?.email) {
      return Response.json({ error: 'Missing employee data' }, { status: 400 });
    }

    // Fetch the employee record (use provided data or fetch by id)
    let employee = employeeData;
    if (!employee || !employee.email) {
      const employees = await base44.asServiceRole.entities.Employee.filter({ id: employeeId });
      employee = employees[0];
    }

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Only process new employees (not updates to existing ones)
    const eventType = payload?.event?.type;
    if (eventType === 'update') {
      // For updates, only run if this is the first time (no existing checklist)
      const existingChecklists = await base44.asServiceRole.entities.OnboardingChecklist.filter({
        employee_email: employee.email
      });
      if (existingChecklists.length > 0) {
        return Response.json({ message: 'Checklist already assigned, skipping' });
      }
    }

    // 1. Find the best matching onboarding template
    const templates = await base44.asServiceRole.entities.OnboardingTemplate.filter({ is_active: true });

    let bestTemplate = null;

    if (templates.length > 0) {
      // Priority: exact dept + designation match > dept only > designation only > generic (no dept/designation)
      const dept = (employee.department || '').toLowerCase().trim();
      const desig = (employee.designation || '').toLowerCase().trim();

      const exactMatch = templates.find(t =>
        t.department && t.designation &&
        t.department.toLowerCase() === dept &&
        t.designation.toLowerCase() === desig
      );

      const deptMatch = templates.find(t =>
        t.department && !t.designation &&
        t.department.toLowerCase() === dept
      );

      const desigMatch = templates.find(t =>
        !t.department && t.designation &&
        t.designation.toLowerCase() === desig
      );

      const genericTemplate = templates.find(t => !t.department && !t.designation);

      bestTemplate = exactMatch || deptMatch || desigMatch || genericTemplate || templates[0];
    }

    let checklistAssigned = false;
    let checklistName = null;

    if (bestTemplate) {
      const assignedDate = new Date().toISOString().split('T')[0];
      const joiningDate = employee.date_of_joining || assignedDate;

      const tasksWithDates = (bestTemplate.tasks || []).map(task => {
        const dueDate = new Date(joiningDate);
        dueDate.setDate(dueDate.getDate() + (task.due_days || 7));
        return {
          ...task,
          due_date: dueDate.toISOString().split('T')[0],
          is_completed: false,
          completed_date: null,
          notes: ''
        };
      });

      await base44.asServiceRole.entities.OnboardingChecklist.create({
        employee_email: employee.email,
        employee_name: employee.full_name,
        template_id: bestTemplate.id,
        template_name: bestTemplate.template_name,
        assigned_date: assignedDate,
        tasks: tasksWithDates,
        progress_percentage: 0,
        status: 'in_progress'
      });

      checklistAssigned = true;
      checklistName = bestTemplate.template_name;
    }

    // 2. Send invite email to the new employee
    const registrationUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/Registration`;

    const emailBody = `
Dear ${employee.full_name},

Welcome to Saber Technologies! We're thrilled to have you join our team.

${employee.department ? `Department: ${employee.department}` : ''}
${employee.designation ? `Designation: ${employee.designation}` : ''}
${employee.date_of_joining ? `Date of Joining: ${employee.date_of_joining}` : ''}

To get started, please complete your profile and submit your documents by clicking the link below:

${registrationUrl}

${checklistAssigned ? `An onboarding checklist ("${checklistName}") has been assigned to you with tasks to complete. You'll find it on your dashboard once you log in.` : ''}

If you have any questions, please reach out to your HR team.

Best regards,
HR Team
Saber Technologies
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: employee.email,
      subject: `Welcome to Saber Technologies — Complete Your Profile`,
      body: emailBody,
      from_name: 'Saber Technologies HR'
    });

    // 3. Create an in-app notification for the HR team
    const hrEmployees = await base44.asServiceRole.entities.Employee.filter({ role: 'hr' });
    const managerEmployees = await base44.asServiceRole.entities.Employee.filter({ role: 'manager' });
    const notifyList = [...hrEmployees, ...managerEmployees];

    await Promise.all(notifyList.map(hr =>
      base44.asServiceRole.entities.Notification.create({
        recipient_email: hr.email,
        title: `New Employee Added: ${employee.full_name}`,
        message: `${employee.full_name} (${employee.designation || 'No designation'} · ${employee.department || 'No department'}) has been added.${checklistAssigned ? ` Onboarding checklist "${checklistName}" was auto-assigned.` : ' No matching onboarding template found — please assign one manually.'} An invite email has been sent.`,
        type: 'info',
        is_read: false,
        link: '/Employees'
      })
    ));

    return Response.json({
      success: true,
      employee_name: employee.full_name,
      checklist_assigned: checklistAssigned,
      checklist_name: checklistName,
      invite_sent: true
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
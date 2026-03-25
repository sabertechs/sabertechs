import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, year } = await req.json();

    if (!month || !year) {
      return Response.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // Get all active permanent employees (exclude freelancers)
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const employees = allEmployees.filter(emp => 
      emp.status === 'active' && 
      emp.employment_type === 'permanent' && 
      emp.role !== 'freelancer'
    );

    // Calculate days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1, daysInMonth);

    const results = {
      success: [],
      failed: [],
      incomplete_attendance: []
    };

    for (const emp of employees) {
      try {
        // Check if all days have attendance marked
        const attendance = await base44.asServiceRole.entities.Attendance.filter({
          employee_email: emp.email,
          date: { 
            $gte: startDate.toISOString().split('T')[0],
            $lte: endDate.toISOString().split('T')[0]
          }
        });

        // Check if attendance is complete (all days marked)
        if (attendance.length < daysInMonth) {
          results.incomplete_attendance.push({
            employee_name: emp.full_name,
            employee_email: emp.email,
            marked_days: attendance.length,
            total_days: daysInMonth,
            missing_days: daysInMonth - attendance.length
          });
          continue;
        }

        // Check if payslip already exists
        const existingPayslips = await base44.asServiceRole.entities.Payslip.filter({
          employee_email: emp.email,
          month: month.toString().padStart(2, '0'),
          year: year
        });

        if (existingPayslips.length > 0) {
          results.failed.push({
            employee_name: emp.full_name,
            reason: 'Payslip already exists'
          });
          continue;
        }

        // Calculate salary based on attendance
        const presentDays = attendance.filter(a => a.status === 'present').length;
        const leaveDays = attendance.filter(a => a.status === 'leave').length;
        const halfDays = attendance.filter(a => a.status === 'half_day').length;
        const holidays = attendance.filter(a => a.status === 'holiday').length;

        // Working days = present + leave + half_day/2 + holidays
        const workingDays = presentDays + leaveDays + (halfDays * 0.5) + holidays;

        // Get salary components
        const components = emp.salary_components || {};
        const deductions = emp.deductions || { pf: 12, esi: 0, pt: 200, tds: 0 };

        // Calculate full month gross
        const fullGrossSalary = Object.values(components).reduce((sum, val) => sum + (val || 0), 0);

        // Pro-rate based on working days
        const proRataFactor = workingDays / daysInMonth;
        const proRatedBasic = (components.basic || 0) * proRataFactor;
        const proRatedHra = (components.hra || 0) * proRataFactor;
        const proRatedDa = (components.da || 0) * proRataFactor;
        const proRatedOther = ((components.medical || 0) + (components.transport || 0) + 
                               (components.special || 0) + (components.other || 0)) * proRataFactor;

        const grossSalary = proRatedBasic + proRatedHra + proRatedDa + proRatedOther;

        // Calculate deductions
        const pfDeduction = (proRatedBasic * (deductions.pf || 0)) / 100;
        const esiDeduction = (grossSalary * (deductions.esi || 0)) / 100;
        const ptDeduction = workingDays > 0 ? (deductions.pt || 0) : 0;
        const tdsDeduction = (grossSalary * (deductions.tds || 0)) / 100;

        const totalDeductions = pfDeduction + esiDeduction + ptDeduction + tdsDeduction;
        const netSalary = grossSalary - totalDeductions;

        // Create payslip
        await base44.asServiceRole.entities.Payslip.create({
          employee_id: emp.employee_id,
          employee_email: emp.email,
          employee_name: emp.full_name,
          month: month.toString().padStart(2, '0'),
          year: year,
          basic_salary: Math.round(proRatedBasic),
          hra: Math.round(proRatedHra),
          da: Math.round(proRatedDa),
          other_allowances: Math.round(proRatedOther),
          gross_salary: Math.round(grossSalary),
          pf_deduction: Math.round(pfDeduction),
          tax_deduction: Math.round(tdsDeduction + ptDeduction),
          other_deductions: Math.round(esiDeduction),
          net_salary: Math.round(netSalary),
          payment_status: 'pending',
          working_days: workingDays,
          total_days: daysInMonth
        });

        results.success.push({
          employee_name: emp.full_name,
          employee_email: emp.email,
          net_salary: Math.round(netSalary),
          working_days: workingDays
        });

      } catch (error) {
        console.error(`Error processing ${emp.full_name}:`, error);
        results.failed.push({
          employee_name: emp.full_name,
          reason: error.message
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_employees: employees.length,
        generated: results.success.length,
        failed: results.failed.length,
        incomplete_attendance: results.incomplete_attendance.length
      },
      details: results
    });

  } catch (error) {
    console.error('Generate payslips error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
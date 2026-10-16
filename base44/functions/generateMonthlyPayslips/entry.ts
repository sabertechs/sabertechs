import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { can } from '../../shared/permissions.ts';
import { calculatePayroll, DEFAULT_PAYROLL_SETTINGS } from '../../shared/payrollCalc.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await can(base44, user, 'payroll.employee.edit'))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { month, year, employee_emails } = await req.json();
    if (!month || !year) {
      return Response.json({ error: 'Month and year are required' }, { status: 400 });
    }

    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDateStr = `${year}-${monthStr}-01`;
    const endDateStr = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    // --- Load payroll settings ---
    const settingsRecords = await base44.asServiceRole.entities.PayrollSettings.filter({ setting_key: 'default' });
    const settings = settingsRecords.length > 0
      ? { ...DEFAULT_PAYROLL_SETTINGS, ...settingsRecords[0] }
      : { ...DEFAULT_PAYROLL_SETTINGS };

    // --- Load holidays for the month ---
    const holidays = await base44.asServiceRole.entities.Holiday.filter({
      date: { $gte: startDateStr, $lte: endDateStr }
    });

    // --- Load leave types (build lookup map: code/name -> is_paid) ---
    const leaveTypesRaw = await base44.asServiceRole.entities.LeaveType.filter({ is_active: true });
    const leaveTypes: Record<string, boolean> = {};
    for (const lt of leaveTypesRaw) {
      if (lt.code) leaveTypes[lt.code] = lt.is_paid;
      if (lt.name) leaveTypes[lt.name] = lt.is_paid;
    }

    // --- Fetch all permanent employees (active + terminated during this month) ---
    const allEmployees = await base44.asServiceRole.entities.Employee.list();
    const employees = allEmployees.filter(emp => {
      if (emp.employment_type !== 'permanent') return false;
      // If employee_emails filter is provided, only process those employees
      if (employee_emails && Array.isArray(employee_emails) && !employee_emails.includes(emp.email)) return false;
      if (emp.status === 'active') return true;
      // Include employees terminated during this month
      if ((emp.status === 'inactive' || emp.status === 'terminated') && emp.termination_date) {
        return emp.termination_date >= startDateStr && emp.termination_date <= endDateStr;
      }
      return false;
    });

    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    for (const emp of employees) {
      try {
        // --- Prevent duplicate payslips ---
        const payslipKey = `${emp.email}|${monthStr}|${year}`;
        const existing = await base44.asServiceRole.entities.Payslip.filter({
          employee_email: emp.email,
          month: monthStr,
          year: year,
        });

        if (existing.length > 0) {
          results.skipped.push({
            employee_name: emp.full_name,
            reason: 'Payslip already exists for this period',
          });
          continue;
        }

        // --- Load attendance for the month ---
        const attendance = await base44.asServiceRole.entities.Attendance.filter({
          employee_email: emp.email,
          date: { $gte: startDateStr, $lte: endDateStr },
        });

        // --- Calculate payroll ---
        const calc = calculatePayroll(emp, attendance, holidays, leaveTypes, settings, month, year);

        // --- Check for calculation errors ---
        if (calc.errors.length > 0) {
          results.failed.push({
            employee_name: emp.full_name,
            reason: calc.errors.join('; '),
          });
          continue;
        }

        // --- Check for incomplete attendance (when treat_pending_as_absent = false) ---
        if (calc.pending_days > 0 && !settings.treat_pending_as_absent) {
          results.skipped.push({
            employee_name: emp.full_name,
            reason: `Incomplete attendance: ${calc.pending_days} day(s) not marked`,
          });
          continue;
        }

        // --- Create payslip (finalized — never recalculated) ---
        await base44.asServiceRole.entities.Payslip.create({
          employee_id: emp.employee_id,
          employee_email: emp.email,
          employee_name: emp.full_name,
          month: monthStr,
          year: year,
          payslip_key: payslipKey,

          // Earnings breakdown
          basic_salary: calc.earnings.basic,
          hra: calc.earnings.hra,
          da: calc.earnings.da,
          other_allowances: calc.earnings.other_allowances,
          gross_salary: calc.earnings.gross,

          // Deductions breakdown (each per its own rule)
          pf_deduction: calc.deductions.pf,
          esi_deduction: calc.deductions.esi,
          pt_deduction: calc.deductions.pt,
          tds_deduction: calc.deductions.tds,
          lwf_deduction: calc.deductions.lwf,
          total_deductions: calc.deductions.total,

          // Legacy backward-compatible fields
          tax_deduction: calc.deductions.tds + calc.deductions.pt,
          other_deductions: calc.deductions.esi + calc.deductions.lwf,

          net_salary: calc.net_salary,

          // Days breakdown
          calendar_days: calc.calendar_days,
          scheduled_working_days: calc.scheduled_working_days,
          payable_days: calc.payable_days,
          present_days: calc.present_days,
          half_days: calc.half_days,
          paid_leave_days: calc.paid_leave_days,
          unpaid_leave_days: calc.unpaid_leave_days,
          holiday_days: calc.holiday_days,
          weekly_off_days: calc.weekly_off_days,
          absent_days: calc.absent_days,

          // Metadata
          prorated: calc.prorated,
          proration_factor: calc.prorated ? calc.proration_factor : 1,
          status: 'finalized',
          payment_status: 'pending',
          warnings: calc.warnings,
        });

        results.success.push({
          employee_name: emp.full_name,
          employee_email: emp.email,
          net_salary: calc.net_salary,
          payable_days: calc.payable_days,
          scheduled_working_days: calc.scheduled_working_days,
          prorated: calc.prorated,
        });
      } catch (error) {
        console.error(`Error processing ${emp.full_name}:`, error);
        results.failed.push({
          employee_name: emp.full_name,
          reason: error.message,
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_employees: employees.length,
        generated: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      details: results,
    });
  } catch (error) {
    console.error('Generate payslips error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});
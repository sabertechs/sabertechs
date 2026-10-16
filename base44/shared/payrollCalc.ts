// base44/shared/payrollCalc.ts
// Policy-driven payroll calculation engine for SaberTechs.
// Separates calendar days, scheduled working days, weekly offs, holidays,
// paid leave, unpaid leave, present days, half-days, and absences.
// Calculates payable days and salary proration according to configurable policy.

export interface PayrollSettings {
  weekly_offs: number[];
  proration_basis: 'scheduled_working_days' | 'calendar_days' | 'no_proration_full_month';
  half_day_pay_factor: number;
  holiday_is_paid: boolean;
  weekly_off_is_paid: boolean;
  pf_employee_rate: number;
  pf_wage_threshold: number;
  esi_employee_rate: number;
  esi_threshold: number;
  pt_amount: number;
  lwf_amount: number;
  tds_mode: 'manual' | 'percentage';
  tds_rate: number;
  rounding_mode: 'round' | 'floor' | 'ceil' | 'none';
  rounding_decimals: number;
  treat_pending_as_absent: boolean;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  weekly_offs: [],
  proration_basis: 'no_proration_full_month',
  half_day_pay_factor: 0.5,
  holiday_is_paid: true,
  weekly_off_is_paid: true,
  pf_employee_rate: 0,
  pf_wage_threshold: 15000,
  esi_employee_rate: 0,
  esi_threshold: 21000,
  pt_amount: 0,
  lwf_amount: 0,
  tds_mode: 'manual',
  tds_rate: 0,
  rounding_mode: 'round',
  rounding_decimals: 0,
  treat_pending_as_absent: true,
};

export interface PayrollResult {
  calendar_days: number;
  scheduled_working_days: number;
  active_start: string;
  active_end: string;
  present_days: number;
  half_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  holiday_days: number;
  weekly_off_days: number;
  absent_days: number;
  pending_days: number;
  payable_days: number;
  prorated: boolean;
  proration_factor: number;
  earnings: {
    basic: number;
    hra: number;
    da: number;
    other_allowances: number;
    gross: number;
  };
  deductions: {
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    lwf: number;
    total: number;
  };
  net_salary: number;
  warnings: string[];
  errors: string[];
}

function applyRounding(value: number, mode: string, decimals: number): number {
  const factor = Math.pow(10, decimals);
  switch (mode) {
    case 'floor': return Math.floor(value * factor) / factor;
    case 'ceil': return Math.ceil(value * factor) / factor;
    case 'none': return value;
    case 'round':
    default: return Math.round(value * factor) / factor;
  }
}

function ds(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calculatePayroll(
  emp: {
    email: string;
    full_name: string;
    employee_id?: string;
    date_of_joining?: string;
    status: string;
    employment_type: string;
    contract_end_date?: string;
    termination_date?: string;
    salary_components?: {
      basic?: number;
      hra?: number;
      da?: number;
      medical?: number;
      transport?: number;
      special?: number;
      other?: number;
    };
  },
  attendance: { date: string; status: string; leave_type?: string }[],
  holidays: { date: string; name: string }[],
  leaveTypes: Record<string, boolean>,
  settings: PayrollSettings,
  month: number,
  year: number
): PayrollResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = ds(year, month, 1);
  const monthEnd = ds(year, month, calendarDays);

  const holidayDates = new Set(holidays.map(h => h.date));

  // --- Determine employee's active period within the month ---
  let activeStart = monthStart;
  let activeEnd = monthEnd;

  if (emp.date_of_joining && emp.date_of_joining > monthStart) {
    activeStart = emp.date_of_joining;
    warnings.push(`Employee joined on ${emp.date_of_joining} — prorating from joining date`);
  }

  const exitDate = emp.termination_date ||
    (emp.employment_type === 'contractual' ? emp.contract_end_date : undefined);
  if (exitDate && exitDate < monthEnd) {
    activeEnd = exitDate;
    warnings.push(`Employee active period ends on ${exitDate} — prorating to exit date`);
  }

  // --- Count days in active period AND full month (for proration denominator) ---
  let scheduledWorkingDays = 0;
  let weeklyOffDays = 0;
  let holidaysInActivePeriod = 0;
  let fullMonthWorkingDays = 0;
  let fullMonthHolidays = 0;
  let fullMonthWeeklyOffs = 0;

  for (let d = 1; d <= calendarDays; d++) {
    const dateStr = ds(year, month, d);
    const date = new Date(Date.UTC(year, month - 1, d));
    const isOff = settings.weekly_offs.includes(date.getUTCDay());
    const isHoliday = holidayDates.has(dateStr);

    // Full month totals (for proration denominator)
    if (isOff) {
      fullMonthWeeklyOffs++;
    } else if (isHoliday) {
      fullMonthHolidays++;
    } else {
      fullMonthWorkingDays++;
    }

    // Active period totals (for payslip display)
    if (dateStr < activeStart || dateStr > activeEnd) continue;
    if (isOff) {
      weeklyOffDays++;
    } else if (isHoliday) {
      holidaysInActivePeriod++;
    } else {
      scheduledWorkingDays++;
    }
  }

  // --- Build attendance map (detect duplicates) ---
  const attendanceMap = new Map<string, { date: string; status: string; leave_type?: string }>();
  for (const a of attendance) {
    if (attendanceMap.has(a.date)) {
      warnings.push(`Duplicate attendance record for ${a.date}`);
    }
    attendanceMap.set(a.date, a);
  }

  // --- Categorize attendance within active period ---
  let presentDays = 0;
  let halfDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let holidayDays = 0;
  let absentDays = 0;
  let pendingDays = 0;

  for (let d = 1; d <= calendarDays; d++) {
    const dateStr = ds(year, month, d);
    if (dateStr < activeStart || dateStr > activeEnd) continue;

    const date = new Date(Date.UTC(year, month - 1, d));
    const isOff = settings.weekly_offs.includes(date.getUTCDay());
    const isHoliday = holidayDates.has(dateStr);

    if (isOff) continue; // weekly off — no attendance expected

    if (isHoliday) {
      holidayDays++;
      continue;
    }

    // Working day — expect attendance
    const att = attendanceMap.get(dateStr);

    if (!att || att.status === 'pending') {
      if (settings.treat_pending_as_absent) {
        absentDays++;
        if (!att) warnings.push(`No attendance for ${dateStr} — treated as absent`);
      } else {
        pendingDays++;
      }
    } else {
      switch (att.status) {
        case 'present':
          presentDays++;
          break;
        case 'half_day':
          halfDays++;
          break;
        case 'leave':
          if (att.leave_type && leaveTypes[att.leave_type] !== undefined) {
            if (leaveTypes[att.leave_type]) {
              paidLeaveDays++;
            } else {
              unpaidLeaveDays++;
            }
          } else if (att.leave_type) {
            paidLeaveDays++;
            warnings.push(`Leave on ${dateStr}: leave_type "${att.leave_type}" not found — defaulted to paid`);
          } else {
            paidLeaveDays++;
            warnings.push(`Leave on ${dateStr}: no leave_type specified — defaulted to paid`);
          }
          break;
        case 'holiday':
          holidayDays++;
          break;
        case 'absent':
          absentDays++;
          break;
      }
    }
  }

  // --- Calculate payable days ---
  const halfDayPay = halfDays * settings.half_day_pay_factor;
  const holidayPay = settings.holiday_is_paid ? holidayDays : 0;
  const weeklyOffPay = settings.weekly_off_is_paid ? weeklyOffDays : 0;
  const payableDays = presentDays + halfDayPay + paidLeaveDays + holidayPay + weeklyOffPay;

  // --- Determine proration ---
  let prorated = false;
  let prorationFactor = 1;

  // Denominator = full month's max payable days (scheduled working days + paid holidays + paid weekly offs)
  const denominator = fullMonthWorkingDays
    + (settings.holiday_is_paid ? fullMonthHolidays : 0)
    + (settings.weekly_off_is_paid ? fullMonthWeeklyOffs : 0);

  if (settings.proration_basis === 'no_proration_full_month') {
    const isFullMonth = activeStart === monthStart && activeEnd === monthEnd;
    const hasReductions = absentDays > 0 || unpaidLeaveDays > 0 || halfDays > 0 || pendingDays > 0;

    if (isFullMonth && !hasReductions) {
      prorated = false;
      prorationFactor = 1;
    } else {
      prorated = true;
      prorationFactor = denominator > 0 ? payableDays / denominator : 0;
    }
  } else if (settings.proration_basis === 'scheduled_working_days') {
    prorated = true;
    prorationFactor = denominator > 0 ? payableDays / denominator : 0;
  } else {
    // calendar_days
    prorated = true;
    prorationFactor = calendarDays > 0 ? payableDays / calendarDays : 0;
  }

  // --- Validate salary ---
  const components = emp.salary_components || {};
  const fullBasic = components.basic || 0;
  const fullHra = components.hra || 0;
  const fullDa = components.da || 0;
  const fullOther = (components.medical || 0) + (components.transport || 0) +
                   (components.special || 0) + (components.other || 0);
  const fullGross = fullBasic + fullHra + fullDa + fullOther;

  if (fullGross <= 0) {
    errors.push('Salary components sum to zero — cannot generate payslip');
  }

  // --- Calculate earnings (prorated) ---
  const basic = fullBasic * prorationFactor;
  const hra = fullHra * prorationFactor;
  const da = fullDa * prorationFactor;
  const otherAllowances = fullOther * prorationFactor;
  const gross = basic + hra + da + otherAllowances;

  // --- Calculate deductions (each per its own rule) ---
  // PF: employee_rate % of min(basic, pf_wage_threshold)
  const pfBase = Math.min(basic, settings.pf_wage_threshold);
  const pf = settings.pf_employee_rate > 0 ? (pfBase * settings.pf_employee_rate) / 100 : 0;

  // ESI: employee_rate % of gross, only if gross <= esi_threshold
  const esi = (settings.esi_employee_rate > 0 && gross <= settings.esi_threshold)
    ? (gross * settings.esi_employee_rate) / 100
    : 0;

  // PT: fixed monthly amount, only if payable_days > 0
  const pt = (settings.pt_amount > 0 && payableDays > 0) ? settings.pt_amount : 0;

  // LWF: fixed monthly amount, only if payable_days > 0
  const lwf = (settings.lwf_amount > 0 && payableDays > 0) ? settings.lwf_amount : 0;

  // TDS: percentage of gross (manual mode = 0, set externally per-payslip)
  const tds = settings.tds_mode === 'percentage'
    ? (gross * settings.tds_rate) / 100
    : 0;

  const totalDeductions = pf + esi + pt + tds + lwf;
  const netSalary = gross - totalDeductions;

  // --- Apply rounding ---
  const round = (v: number) => applyRounding(v, settings.rounding_mode, settings.rounding_decimals);

  return {
    calendar_days: calendarDays,
    scheduled_working_days: scheduledWorkingDays,
    active_start: activeStart,
    active_end: activeEnd,
    present_days: presentDays,
    half_days: halfDays,
    paid_leave_days: paidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    holiday_days: holidayDays,
    weekly_off_days: weeklyOffDays,
    absent_days: absentDays,
    pending_days: pendingDays,
    payable_days: Math.round(payableDays * 100) / 100,
    prorated,
    proration_factor: prorationFactor,
    earnings: {
      basic: round(basic),
      hra: round(hra),
      da: round(da),
      other_allowances: round(otherAllowances),
      gross: round(gross),
    },
    deductions: {
      pf: round(pf),
      esi: round(esi),
      pt: round(pt),
      tds: round(tds),
      lwf: round(lwf),
      total: round(totalDeductions),
    },
    net_salary: round(netSalary),
    warnings,
    errors,
  };
}
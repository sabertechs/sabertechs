import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Plus, Minus } from "lucide-react";

export default function SalaryBreakdown({ employee, workingDays, totalDays, leaves = 0 }) {
  if (!employee?.salary_components) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 text-center text-slate-500">
          <p>No salary components defined</p>
        </CardContent>
      </Card>
    );
  }

  const components = employee.salary_components;
  const deductions = employee.deductions || { pf: 12, esi: 0, pt: 200, tds: 0 };

  // Calculate gross salary
  const fullGrossSalary = Object.values(components).reduce((sum, val) => sum + (val || 0), 0);

  // Calculate pro-rated salary based on working days
  const daysInMonth = totalDays || 30;
  const effectiveWorkingDays = workingDays || daysInMonth;
  const proRataFactor = effectiveWorkingDays / daysInMonth;

  // Apply pro-rata to all components
  const proRatedBasic = (components.basic || 0) * proRataFactor;
  const proRatedHra = (components.hra || 0) * proRataFactor;
  const proRatedDa = (components.da || 0) * proRataFactor;
  const proRatedMedical = (components.medical || 0) * proRataFactor;
  const proRatedTransport = (components.transport || 0) * proRataFactor;
  const proRatedSpecial = (components.special || 0) * proRataFactor;
  const proRatedOther = (components.other || 0) * proRataFactor;

  const proRatedGross = proRatedBasic + proRatedHra + proRatedDa + proRatedMedical + proRatedTransport + proRatedSpecial + proRatedOther;

  // Calculate deductions
  const pfDeduction = (proRatedBasic * (deductions.pf || 0)) / 100;
  const esiDeduction = (proRatedGross * (deductions.esi || 0)) / 100;
  const ptDeduction = effectiveWorkingDays > 0 ? (deductions.pt || 0) : 0;
  const tdsDeduction = (proRatedGross * (deductions.tds || 0)) / 100;

  const totalDeductions = pfDeduction + esiDeduction + ptDeduction + tdsDeduction;
  const netSalary = proRatedGross - totalDeductions;

  const earnings = [
    { label: "Basic Salary", amount: proRatedBasic, original: components.basic },
    { label: "HRA", amount: proRatedHra, original: components.hra },
    { label: "DA", amount: proRatedDa, original: components.da },
    { label: "Medical Allowance", amount: proRatedMedical, original: components.medical },
    { label: "Transport Allowance", amount: proRatedTransport, original: components.transport },
    { label: "Special Allowance", amount: proRatedSpecial, original: components.special },
    { label: "Other Allowances", amount: proRatedOther, original: components.other }
  ].filter(item => item.original > 0);

  const deductionsList = [
    { label: "PF", amount: pfDeduction, note: `${deductions.pf}% of Basic` },
    { label: "ESI", amount: esiDeduction, note: `${deductions.esi}% of Gross` },
    { label: "Professional Tax", amount: ptDeduction, note: "" },
    { label: "TDS", amount: tdsDeduction, note: `${deductions.tds}% of Gross` }
  ].filter(item => item.amount > 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-green-600" />
          Salary Breakdown
        </CardTitle>
        {workingDays && totalDays && (
          <p className="text-sm text-slate-500 mt-1">
            Based on {effectiveWorkingDays} working days out of {daysInMonth} days
            {leaves > 0 && ` (includes ${leaves} approved leave${leaves > 1 ? 's' : ''})`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earnings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-slate-700">Earnings</h4>
          </div>
          <div className="space-y-2">
            {earnings.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">{item.label}</span>
                <div className="text-right">
                  <span className="font-medium">₹{Math.round(item.amount).toLocaleString()}</span>
                  {proRataFactor < 1 && (
                    <span className="text-xs text-slate-400 ml-2">
                      (₹{Math.round(item.original).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg font-semibold">
              <span className="text-green-700">Gross Salary</span>
              <span className="text-green-700">₹{Math.round(proRatedGross).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        {deductionsList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Minus className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-slate-700">Deductions</h4>
            </div>
            <div className="space-y-2">
              {deductionsList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <span className="text-slate-600">{item.label}</span>
                    {item.note && <span className="text-xs text-slate-400 ml-2">({item.note})</span>}
                  </div>
                  <span className="font-medium text-red-600">₹{Math.round(item.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 bg-red-50 px-3 rounded-lg font-semibold">
                <span className="text-red-700">Total Deductions</span>
                <span className="text-red-700">₹{Math.round(totalDeductions).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Net Salary */}
        <div className="pt-4 border-t-2 border-slate-200">
          <div className="flex justify-between items-center py-4 bg-indigo-600 px-4 rounded-xl text-white">
            <span className="text-lg font-bold">Net Salary</span>
            <span className="text-2xl font-bold">₹{Math.round(netSalary).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
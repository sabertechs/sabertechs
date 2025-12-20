import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, IndianRupee } from "lucide-react";

export default function SalaryComponentsForm({ employee, onSave }) {
  const [components, setComponents] = useState({
    basic: 0,
    hra: 0,
    da: 0,
    medical: 0,
    transport: 0,
    special: 0,
    other: 0
  });

  const [deductions, setDeductions] = useState({
    pf: 12,
    esi: 0,
    pt: 200,
    tds: 0
  });

  useEffect(() => {
    if (employee?.salary_components) {
      setComponents(employee.salary_components);
    } else if (employee?.salary) {
      // Auto-calculate default breakdown
      const basic = Math.round(employee.salary * 0.4);
      const hra = Math.round(employee.salary * 0.25);
      const da = Math.round(employee.salary * 0.15);
      const medical = 1250;
      const transport = 1600;
      const remaining = employee.salary - (basic + hra + da + medical + transport);
      setComponents({
        basic,
        hra,
        da,
        medical,
        transport,
        special: remaining,
        other: 0
      });
    }

    if (employee?.deductions) {
      setDeductions(employee.deductions);
    }
  }, [employee]);

  const handleComponentChange = (field, value) => {
    setComponents(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleDeductionChange = (field, value) => {
    setDeductions(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const grossSalary = Object.values(components).reduce((sum, val) => sum + val, 0);

  const handleSave = () => {
    onSave({
      salary: grossSalary,
      salary_components: components,
      deductions: deductions
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          Salary Components
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earnings */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-4">Earnings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Basic Salary</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.basic}
                  onChange={(e) => handleComponentChange('basic', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>HRA (House Rent Allowance)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.hra}
                  onChange={(e) => handleComponentChange('hra', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>DA (Dearness Allowance)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.da}
                  onChange={(e) => handleComponentChange('da', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Medical Allowance</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.medical}
                  onChange={(e) => handleComponentChange('medical', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transport Allowance</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.transport}
                  onChange={(e) => handleComponentChange('transport', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special Allowance</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.special}
                  onChange={(e) => handleComponentChange('special', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Other Allowances</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={components.other}
                  onChange={(e) => handleComponentChange('other', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              Gross Salary: ₹{grossSalary.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Deductions */}
        <div className="border-t pt-6">
          <h4 className="font-semibold text-slate-700 mb-4">Deductions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>PF (% of Basic)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={deductions.pf}
                  onChange={(e) => handleDeductionChange('pf', e.target.value)}
                  placeholder="12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>ESI (% of Gross)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={deductions.esi}
                  onChange={(e) => handleDeductionChange('esi', e.target.value)}
                  placeholder="0.75"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Professional Tax</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={deductions.pt}
                  onChange={(e) => handleDeductionChange('pt', e.target.value)}
                  className="pl-9"
                  placeholder="200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>TDS (% of Gross)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={deductions.tds}
                  onChange={(e) => handleDeductionChange('tds', e.target.value)}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            Save Salary Structure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
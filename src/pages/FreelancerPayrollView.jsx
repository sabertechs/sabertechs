import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";

const monthLabel = (d) => `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
const monthValue = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function buildMonthOptions() {
  const options = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    options.push({ label: monthLabel(d), value: monthValue(d) });
  }
  return options;
}

export default function FreelancerPayrollView() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentMonthValue = useMemo(() => monthValue(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['myPayroll', user?.email, selectedMonth],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPayrollRecords', { month: selectedMonth });
      return res.data?.records || [];
    },
    enabled: !!user?.email,
  });

  const totalPayment = records.reduce((s, r) => s + (r.payment || 0), 0);
  const totalDrives = records.length;
  const selectedLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

  const navigateMonth = (dir) => {
    const idx = monthOptions.findIndex(o => o.value === selectedMonth);
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < monthOptions.length) setSelectedMonth(monthOptions[newIdx].value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Payroll</h1>
        <p className="text-slate-500 mt-1">View your payroll records by month</p>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} disabled={monthOptions.findIndex(o => o.value === selectedMonth) === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} disabled={selectedMonth === currentMonthValue}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl"><Briefcase className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalDrives}</p>
              <p className="text-sm text-slate-500">Total Drives</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl"><IndianRupee className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">₹{totalPayment.toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-500">Total Earnings — {selectedLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{records.length} record{records.length !== 1 ? 's' : ''} — {selectedLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No records found for {selectedLabel}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Client</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Drive Timing</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Role</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                      <td className="py-3 px-3 text-slate-700">{r.client_name}</td>
                      <td className="py-3 px-3 text-slate-600">{r.drive_timing}</td>
                      <td className="py-3 px-3 text-slate-600">{r.role}</td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                        ₹{(r.payment || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Clock, Briefcase, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export default function FreelancerPayrollView() {
  const [userEmail, setUserEmail] = useState(null);

  // Read month from URL param or default to current month
  const getInitialMonth = () => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('month');
    if (m) return m;
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth);

  // Navigate months
  const navigateMonth = (direction) => {
    const [monthName, year] = selectedMonth.split(' ');
    const date = new Date(`${monthName} 1, ${year}`);
    date.setMonth(date.getMonth() + direction);
    setSelectedMonth(`${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`);
  };

  const currentMonthLabel = (() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  })();

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email?.toLowerCase()));
  }, []);

  // RLS on the entity ensures only own records are returned
  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['myPayroll', userEmail],
    queryFn: () => base44.entities.FreelancerPayroll.filter({ proctor_email: userEmail }, '-drive_start_date', 500),
    enabled: !!userEmail,
  });

  // Get unique months for dropdown
  const months = [...new Set(allRecords.map(r => r.project_month).filter(Boolean))].sort().reverse();

  const records = allRecords.filter(r => r.project_month === selectedMonth);

  const totalAmount = records.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalHours = records.reduce((sum, r) => {
    if (!r.driver_hours) return sum;
    const parts = r.driver_hours.split(':');
    return sum + (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
  }, 0);

  const formatHours = (decimal) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}h ${m}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Payroll</h1>
          <p className="text-slate-500 mt-1">Your work records and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Show a range of months: 12 past + current */}
              {Array.from({ length: 13 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (12 - i));
                return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
              }).map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(1)}
            disabled={selectedMonth === currentMonthLabel}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {selectedMonth !== currentMonthLabel && (
            <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => setSelectedMonth(currentMonthLabel)}>
              Current
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-indigo-100 text-sm">Total Drives</p>
                <p className="text-3xl font-bold">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-emerald-100 text-sm">Total Earnings</p>
                <p className="text-3xl font-bold">
                  {totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-purple-100 text-sm">Total Hours</p>
                <p className="text-3xl font-bold">{formatHours(totalHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Work Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No payroll records found</p>
              <p className="text-sm mt-1">Your payroll records will appear here once uploaded by HR</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Drive ID</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Client</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Hours</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Role</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-indigo-600">{r.drive_id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{r.client_name}</div>
                        <div className="text-xs text-slate-400">{r.account_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.drive_start_date}
                        {r.drive_end_date && r.drive_end_date !== r.drive_start_date && (
                          <span className="text-slate-400"> → {r.drive_end_date}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.start_time} – {r.end_time}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-purple-700 border-purple-200">
                          <Clock className="w-3 h-3 mr-1" />{r.driver_hours}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.role}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {r.total_amount != null
                          ? <span className="text-emerald-600">₹{r.total_amount.toLocaleString('en-IN')}</span>
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totalAmount > 0 && (
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 font-semibold text-slate-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 text-base">
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Clock, Briefcase, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";

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

export default function AdminPayrollView() {
  const monthOptions = buildMonthOptions();
  const currentMonthValue = monthValue(new Date());

  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [emailFilter, setEmailFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchRecords = async (month, email) => {
    setLoading(true);
    try {
      const payload = {};
      if (month) payload.month = month;
      if (email && email.trim()) payload.freelancer_email = email.trim();
      const res = await base44.functions.invoke('getPayrollRecords', payload);
      setRecords(res.data?.records || []);
      setPage(1);
    } catch (e) {
      console.error('Failed to fetch payroll records:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(selectedMonth, emailFilter);
  }, [selectedMonth]);

  const navigateMonth = (dir) => {
    const idx = monthOptions.findIndex(o => o.value === selectedMonth);
    const newIdx = idx + dir;
    if (newIdx >= 0 && newIdx < monthOptions.length) {
      setSelectedMonth(monthOptions[newIdx].value);
    }
  };

  const handleSearch = () => fetchRecords(selectedMonth, emailFilter);

  // Unique freelancers for summary
  const freelancers = [...new Set(records.map(r => r.proctor_email))];
  const totalAmount = records.reduce((s, r) => s + (r.total_amount || 0), 0);
  const totalDrives = records.length;

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

  const exportXLSX = () => {
    const rows = records.map(r => ({
      'Name': r.proctor_name,
      'Email': r.proctor_email,
      'Drive ID': r.drive_id,
      'Client': r.client_name,
      'Role': r.role,
      'Start Date': r.drive_start_date,
      'End Date': r.drive_end_date,
      'Hours': r.driver_hours,
      'Amount (₹)': r.total_amount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payroll Records</h1>
          <p className="text-slate-500 mt-1">View freelancer payroll by month or individual</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportXLSX} disabled={records.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export XLSX
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Month navigation */}
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

            {/* Email search */}
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Input
                placeholder="Filter by freelancer email..."
                value={emailFilter}
                onChange={e => setEmailFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
              {emailFilter && (
                <Button variant="ghost" size="sm" onClick={() => { setEmailFilter(''); fetchRecords(selectedMonth, ''); }}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="p-3 bg-purple-100 rounded-xl"><Search className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{freelancers.length}</p>
              <p className="text-sm text-slate-500">Freelancers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl"><IndianRupee className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-slate-800">₹{totalAmount.toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-500">Total Payout — {selectedLabel}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {records.length} record{records.length !== 1 ? 's' : ''} — {selectedLabel}
            {emailFilter && <span className="text-slate-500 font-normal text-sm ml-2">for {emailFilter}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No records found for this filter.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Freelancer</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Drive ID</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Client</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Hours</th>
                      <th className="text-right py-3 px-3 text-slate-500 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800">{r.proctor_name}</p>
                          <p className="text-xs text-slate-400">{r.proctor_email}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{r.drive_id}</td>
                        <td className="py-3 px-3 text-slate-600">{r.client_name}</td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{r.drive_start_date}</td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3" /> {r.driver_hours || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                          ₹{(r.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, records.length)} of {records.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-700">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
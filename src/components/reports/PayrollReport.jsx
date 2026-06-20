import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ReportShell from "./ReportShell";
import { downloadCSV, formatDate } from "./reportUtils";

export default function PayrollReport({ onBack }) {
  const [monthFilter, setMonthFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: payroll = [], isLoading } = useQuery({
    queryKey: ["freelancer-payroll-all"],
    queryFn: () => base44.entities.FreelancerPayroll.list("-date", 5000),
  });

  const months = useMemo(() => [...new Set(payroll.map(p => p.project_month).filter(Boolean))].sort().reverse(), [payroll]);
  const batches = useMemo(() => [...new Set(payroll.map(p => p.upload_batch).filter(Boolean))].sort().reverse(), [payroll]);
  const clients = useMemo(() => [...new Set(payroll.map(p => p.client_name).filter(Boolean))].sort(), [payroll]);

  const filtered = useMemo(() => {
    return payroll.filter(p => {
      if (monthFilter !== "all" && p.project_month !== monthFilter) return false;
      if (batchFilter !== "all" && p.upload_batch !== batchFilter) return false;
      if (clientFilter !== "all" && p.client_name !== clientFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.proctor_email?.toLowerCase().includes(q) || p.proctor_name?.toLowerCase().includes(q) || p.mobile_number?.includes(q);
      }
      return true;
    });
  }, [payroll, monthFilter, batchFilter, clientFilter, search]);

  const totalPayment = useMemo(() => filtered.reduce((sum, p) => sum + (p.payment || 0), 0), [filtered]);

  const handleDownload = () => {
    const rows = filtered.map(p => ({
      Date: formatDate(p.date),
      Proctor_Name: p.proctor_name || "",
      Proctor_Email: p.proctor_email || "",
      Mobile: p.mobile_number || "",
      Client: p.client_name || "",
      Drive_Timing: p.drive_timing || "",
      Role: p.role || "",
      Payment: p.payment ?? "",
      Project_Month: p.project_month || "",
      Upload_Batch: p.upload_batch || "",
    }));
    downloadCSV(rows, `Payroll_Report_${monthFilter === "all" ? "All" : monthFilter}.csv`);
  };

  return (
    <ReportShell
      title="Payroll Report"
      description="Freelancer payroll records filtered by month, batch, client"
      onBack={onBack}
      onDownload={handleDownload}
      loading={isLoading}
      rowCount={filtered.length}
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Search</Label>
              <Input placeholder="Name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Project Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Upload Batch</Label>
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-slate-800">{filtered.length.toLocaleString("en-IN")}</div>
            <div className="text-sm text-slate-500 mt-1">Total Records</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-700">₹{totalPayment.toLocaleString("en-IN")}</div>
            <div className="text-sm text-slate-500 mt-1">Total Payout</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-slate-800">
              {filtered.length ? Math.round(totalPayment / filtered.length).toLocaleString("en-IN") : 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">Avg. Payout (₹)</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["Date", "Name", "Email", "Mobile", "Client", "Role", "Drive Timing", "Payment (₹)", "Month", "Batch"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-400">No records found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.proctor_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.proctor_email}</td>
                    <td className="px-4 py-3 text-slate-600">{p.mobile_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.client_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.role || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.drive_timing || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">₹{p.payment?.toLocaleString("en-IN") ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.project_month || "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[100px]">{p.upload_batch || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
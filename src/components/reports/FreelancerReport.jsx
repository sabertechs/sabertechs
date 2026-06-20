import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportShell from "./ReportShell";
import { downloadCSV, formatDate } from "./reportUtils";

export default function FreelancerReport({ onBack }) {
  const [tab, setTab] = useState("applications");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["project-applications-report"],
    queryFn: () => base44.entities.ProjectApplication.list("-created_date", 2000),
  });

  const { data: payroll = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ["freelancer-payroll-report"],
    queryFn: () => base44.entities.FreelancerPayroll.list("-date", 2000),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-report"],
    queryFn: () => base44.entities.Project.list("-created_date", 500),
  });

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  const months = useMemo(() => [...new Set(payroll.map(p => p.project_month).filter(Boolean))].sort().reverse(), [payroll]);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (projectFilter !== "all" && app.project_id !== projectFilter) return false;
      if (paymentFilter !== "all" && app.payment_status !== paymentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return app.freelancer_email?.toLowerCase().includes(q) || app.freelancer_name?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [applications, statusFilter, projectFilter, paymentFilter, search]);

  const filteredPayroll = useMemo(() => {
    return payroll.filter(p => {
      if (monthFilter !== "all" && p.project_month !== monthFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.proctor_email?.toLowerCase().includes(q) || p.proctor_name?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [payroll, monthFilter, search]);

  const handleDownload = () => {
    if (tab === "applications") {
      const rows = filteredApps.map(app => ({
        Project_Name: app.project_name || projectMap[app.project_id]?.name || "",
        Freelancer_Name: app.freelancer_name || "",
        Freelancer_Email: app.freelancer_email || "",
        Freelancer_Phone: app.freelancer_phone || "",
        Status: app.status || "",
        Payment_Status: app.payment_status || "",
        Rating: app.rating ?? "",
        Group_ID: app.group_id || "",
        Notes: app.notes || "",
      }));
      downloadCSV(rows, "Freelancer_Applications_Report.csv");
    } else {
      const rows = filteredPayroll.map(p => ({
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
      downloadCSV(rows, `Freelancer_Payroll_Report_${monthFilter}.csv`);
    }
  };

  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const rowCount = tab === "applications" ? filteredApps.length : filteredPayroll.length;

  return (
    <ReportShell
      title="Freelancer Report"
      description="Applications and payroll data for all freelancers"
      onBack={onBack}
      onDownload={handleDownload}
      loading={loadingApps || loadingPayroll}
      rowCount={rowCount}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
        </TabsList>

        {/* Shared search */}
        <Card className="border-0 shadow-sm mt-4">
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Search</Label>
                <Input placeholder="Freelancer name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <TabsContent value="applications" className="m-0 contents">
                <div className="space-y-1">
                  <Label>Project</Label>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Application Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Payment Status</Label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="payroll" className="m-0 contents">
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
              </TabsContent>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="applications">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {["Project", "Freelancer", "Email", "Phone", "Status", "Payment", "Rating", "Group"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400">No records found</td></tr>
                    ) : filteredApps.map(app => (
                      <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{app.project_name || "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{app.freelancer_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{app.freelancer_email}</td>
                        <td className="px-4 py-3 text-slate-600">{app.freelancer_phone || "-"}</td>
                        <td className="px-4 py-3"><Badge className={statusColors[app.status] || ""}>{app.status}</Badge></td>
                        <td className="px-4 py-3">
                          <Badge className={app.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                            {app.payment_status || "pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{app.rating ? `${app.rating}/5` : "-"}</td>
                        <td className="px-4 py-3 text-slate-500">{app.group_id || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {["Date", "Name", "Email", "Mobile", "Client", "Role", "Drive Timing", "Payment (₹)", "Month"].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayroll.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-10 text-slate-400">No records found</td></tr>
                    ) : filteredPayroll.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.proctor_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.proctor_email}</td>
                        <td className="px-4 py-3 text-slate-600">{p.mobile_number || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.client_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.role || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.drive_timing || "-"}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">₹{p.payment?.toLocaleString("en-IN") ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-500">{p.project_month || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ReportShell>
  );
}
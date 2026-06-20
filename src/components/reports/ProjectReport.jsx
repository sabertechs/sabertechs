import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ReportShell from "./ReportShell";
import { downloadCSV, formatDate } from "./reportUtils";

export default function ProjectReport({ onBack }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects-report"],
    queryFn: () => base44.entities.Project.list("-created_date", 500),
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["project-applications-report"],
    queryFn: () => base44.entities.ProjectApplication.list("-created_date", 2000),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["project-groups-report"],
    queryFn: () => base44.entities.ProjectGroup.list("-created_date", 1000),
  });

  // Build app counts per project
  const appCounts = useMemo(() => {
    const counts = {};
    applications.forEach(app => {
      if (!counts[app.project_id]) counts[app.project_id] = { total: 0, accepted: 0, pending: 0, rejected: 0, paid: 0 };
      counts[app.project_id].total++;
      if (app.status) counts[app.project_id][app.status] = (counts[app.project_id][app.status] || 0) + 1;
      if (app.payment_status === "paid") counts[app.project_id].paid++;
    });
    return counts;
  }, [applications]);

  const groupCounts = useMemo(() => {
    const counts = {};
    groups.forEach(g => {
      counts[g.project_id] = (counts[g.project_id] || 0) + 1;
    });
    return counts;
  }, [groups]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (workModeFilter !== "all" && p.work_mode !== workModeFilter) return false;
      if (priorityFilter !== "all" && p.priority !== priorityFilter) return false;
      if (dateFrom && p.start_date < dateFrom) return false;
      if (dateTo && p.end_date > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.project_code?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [projects, statusFilter, workModeFilter, priorityFilter, dateFrom, dateTo, search]);

  const statusColors = {
    draft: "bg-slate-100 text-slate-600",
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  const handleDownload = () => {
    const rows = filtered.map(p => {
      const counts = appCounts[p.id] || {};
      const fillPct = p.total_slots ? Math.round(((p.filled_slots || 0) / p.total_slots) * 100) : 0;
      return {
        Project_Code: p.project_code || "",
        Name: p.name || "",
        Status: p.status || "",
        Work_Mode: p.work_mode || "",
        Priority: p.priority || "",
        Location: p.location || "",
        Start_Date: formatDate(p.start_date),
        End_Date: formatDate(p.end_date),
        Total_Slots: p.total_slots ?? "",
        Filled_Slots: p.filled_slots ?? "",
        Fill_Percentage: fillPct + "%",
        Payout: p.payout ?? "",
        Total_Applications: counts.total || 0,
        Accepted: counts.accepted || 0,
        Pending: counts.pending || 0,
        Rejected: counts.rejected || 0,
        Paid: counts.paid || 0,
        Groups: groupCounts[p.id] || 0,
        Supervisor: p.supervisor_name || "",
        Supervisor_Email: p.supervisor_email || "",
        App_Start: formatDate(p.application_start_date),
        App_End: formatDate(p.application_end_date),
      };
    });
    downloadCSV(rows, "Project_Report.csv");
  };

  return (
    <ReportShell
      title="Project Report"
      description="Filter projects by status, work mode, priority, date range"
      onBack={onBack}
      onDownload={handleDownload}
      loading={loadingProjects || loadingApps}
      rowCount={filtered.length}
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1 lg:col-span-2">
              <Label>Search</Label>
              <Input placeholder="Name, code, location..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Work Mode</Label>
              <Select value={workModeFilter} onValueChange={setWorkModeFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="center_based">Center Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End Before</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["Code", "Project", "Status", "Mode", "Priority", "Location", "Dates", "Slots", "Applications", "Payout"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-400">No records found</td></tr>
                ) : filtered.map(p => {
                  const counts = appCounts[p.id] || {};
                  const fillPct = p.total_slots ? Math.round(((p.filled_slots || 0) / p.total_slots) * 100) : 0;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{p.project_code || "-"}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap max-w-[180px] truncate">{p.name}</td>
                      <td className="px-4 py-3"><Badge className={statusColors[p.status] || ""}>{p.status?.replace("_", " ")}</Badge></td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{p.work_mode?.replace("_", " ")}</td>
                      <td className="px-4 py-3"><Badge className={priorityColors[p.priority] || ""}>{p.priority}</Badge></td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.location || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 mb-1">{p.filled_slots || 0}/{p.total_slots || "-"}</div>
                        {p.total_slots ? <Progress value={fillPct} className="h-1.5 w-16" /> : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs space-y-0.5">
                          <div><span className="text-slate-500">Total:</span> <strong>{counts.total || 0}</strong></div>
                          <div><span className="text-green-600">✓ {counts.accepted || 0}</span> <span className="text-red-500 ml-1">✗ {counts.rejected || 0}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">₹{p.payout?.toLocaleString("en-IN") ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
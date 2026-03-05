import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Briefcase, CheckCircle, Clock, AlertTriangle, TrendingUp, IndianRupee, MapPin, Trophy, TrendingDown } from "lucide-react";

const STATUS_COLORS = {
  draft: "#94a3b8",
  open: "#22c55e",
  in_progress: "#a855f7",
  completed: "#3b82f6",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

export default function ProjectAnalytics() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [priority, setPriority] = useState("all");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["allApplications"],
    queryFn: () => base44.entities.ProjectApplication.list("-created_date", 500),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["allProjectTasks"],
    queryFn: () => base44.entities.ProjectTask.list("-created_date", 1000),
  });

  // Apply filters
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (workMode !== "all" && p.work_mode !== workMode) return false;
      if (priority !== "all" && p.priority !== priority) return false;
      if (dateFrom) {
        const start = parseISO(p.start_date || p.created_date);
        if (start < parseISO(dateFrom)) return false;
      }
      if (dateTo) {
        const start = parseISO(p.start_date || p.created_date);
        if (start > parseISO(dateTo)) return false;
      }
      return true;
    });
  }, [projects, workMode, priority, dateFrom, dateTo]);

  // Key metrics
  const metrics = useMemo(() => {
    const total = filtered.length;
    const byStatus = filtered.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const payouts = filtered.filter((p) => p.payout > 0).map((p) => p.payout);
    const avgPayout = payouts.length ? payouts.reduce((a, b) => a + b, 0) / payouts.length : 0;
    const totalPayout = payouts.reduce((a, b) => a + b, 0);

    const completed = filtered.filter((p) => p.status === "completed");
    const completedOnTime = completed.filter((p) => {
      if (!p.end_date) return true;
      // If updated_date (proxy for completion date) is before or on end_date, it's on time
      return !isAfter(parseISO(p.updated_date), parseISO(p.end_date));
    });
    const completedOverdue = completed.length - completedOnTime.length;

    const totalSlots = filtered.reduce((sum, p) => sum + (p.total_slots || 0), 0);
    const filledSlots = filtered.reduce((sum, p) => sum + (p.filled_slots || 0), 0);

    return {
      total,
      byStatus,
      avgPayout,
      totalPayout,
      completedOnTime: completedOnTime.length,
      completedOverdue,
      totalSlots,
      filledSlots,
    };
  }, [filtered]);

  // Chart data
  const statusChartData = Object.entries(metrics.byStatus).map(([status, count]) => ({
    name: status.replace("_", " "),
    count,
    fill: STATUS_COLORS[status] || "#94a3b8",
  }));

  const priorityChartData = useMemo(() => {
    const byPriority = filtered.reduce((acc, p) => {
      const key = p.priority || "medium";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byPriority).map(([key, count]) => ({
      name: key,
      count,
      fill: PRIORITY_COLORS[key] || "#94a3b8",
    }));
  }, [filtered]);

  const workModeChartData = useMemo(() => {
    const byMode = filtered.reduce((acc, p) => {
      const key = p.work_mode || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byMode).map(([key, count]) => ({
      name: key === "center_based" ? "Center Based" : key.charAt(0).toUpperCase() + key.slice(1),
      value: count,
    }));
  }, [filtered]);

  const onTimeData = [
    { name: "On Time", value: metrics.completedOnTime, fill: "#22c55e" },
    { name: "Overdue", value: metrics.completedOverdue, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Task metrics per project
  const tasksByProject = useMemo(() => {
    const map = {};
    allTasks.forEach((t) => {
      if (!map[t.project_id]) map[t.project_id] = { total: 0, completed: 0 };
      map[t.project_id].total += 1;
      if (t.status === "completed") map[t.project_id].completed += 1;
    });
    return map;
  }, [allTasks]);

  // Remaining vs total tasks chart data (per filtered project, top 10 by total tasks)
  const taskCompletionData = useMemo(() => {
    return filtered
      .map((p) => {
        const t = tasksByProject[p.id] || { total: 0, completed: 0 };
        return {
          name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
          fullName: p.name,
          completed: t.completed,
          remaining: t.total - t.completed,
          total: t.total,
          completionPct: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, tasksByProject]);

  // Project performance (best/worst) by task completion %
  const projectPerformance = useMemo(() => {
    const withTasks = filtered
      .map((p) => {
        const t = tasksByProject[p.id] || { total: 0, completed: 0 };
        return {
          ...p,
          totalTasks: t.total,
          completedTasks: t.completed,
          remainingTasks: t.total - t.completed,
          completionPct: t.total > 0 ? Math.round((t.completed / t.total) * 100) : null,
        };
      })
      .filter((p) => p.totalTasks > 0);

    const sorted = [...withTasks].sort((a, b) => (b.completionPct ?? 0) - (a.completionPct ?? 0));
    return {
      best: sorted.slice(0, 3),
      worst: sorted.slice(-3).reverse(),
    };
  }, [filtered, tasksByProject]);

  // Center performance (group by location)
  const centerPerformance = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      const center = p.location || "Unknown";
      if (!map[center]) map[center] = { location: center, totalTasks: 0, completedTasks: 0, projects: 0 };
      const t = tasksByProject[p.id] || { total: 0, completed: 0 };
      map[center].totalTasks += t.total;
      map[center].completedTasks += t.completed;
      map[center].projects += 1;
    });
    return Object.values(map)
      .map((c) => ({
        ...c,
        completionPct: c.totalTasks > 0 ? Math.round((c.completedTasks / c.totalTasks) * 100) : 0,
      }))
      .filter((c) => c.totalTasks > 0)
      .sort((a, b) => b.completionPct - a.completionPct);
  }, [filtered, tasksByProject]);

  // Payout by month
  const payoutByMonth = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      if (!p.start_date || !p.payout) return;
      const month = format(parseISO(p.start_date), "MMM yyyy");
      if (!map[month]) map[month] = { month, totalPayout: 0, count: 0 };
      map[month].totalPayout += p.payout;
      map[month].count += 1;
    });
    return Object.values(map).slice(-8);
  }, [filtered]);

  const statCards = [
    {
      label: "Total Projects",
      value: metrics.total,
      icon: Briefcase,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Completed",
      value: metrics.byStatus["completed"] || 0,
      icon: CheckCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "In Progress",
      value: metrics.byStatus["in_progress"] || 0,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Open",
      value: metrics.byStatus["open"] || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Completed On Time",
      value: metrics.completedOnTime,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Completed Overdue",
      value: metrics.completedOverdue,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Project Analytics</h2>
        <p className="text-slate-500 text-sm mt-1">Overview of project performance and metrics</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Work Mode</Label>
            <Select value={workMode} onValueChange={setWorkMode}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="center_based">Center Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(dateFrom || dateTo || workMode !== "all" || priority !== "all") && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setWorkMode("all"); setPriority("all"); }}
              className="text-sm text-indigo-600 hover:underline mt-5"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto text-sm text-slate-500 mt-5">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {projects.length} projects
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-xl font-bold text-slate-800">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChartData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val) => [val, "Projects"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Completed On Time vs Overdue */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Completed: On Time vs Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            {onTimeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No completed projects</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={onTimeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {onTimeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Work Mode & Priority Split */}
        <div className="space-y-4">
          <Card className="border border-slate-200">
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-semibold text-slate-700">Work Mode Split</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={90}>
                <PieChart>
                  <Pie data={workModeChartData} cx="50%" cy="50%" outerRadius={38} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    <Cell fill="#6366f1" />
                    <Cell fill="#a855f7" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardHeader className="pb-1">
              <CardTitle className="text-base font-semibold text-slate-700">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {priorityChartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-16 text-xs capitalize text-slate-600">{d.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${metrics.total ? (d.count / metrics.total) * 100 : 0}%`,
                          backgroundColor: d.fill,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasks: Remaining vs Completed per Project */}
      {taskCompletionData.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700">Tasks: Completed vs Remaining (Top Projects)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={taskCompletionData} barSize={24} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, name === "completed" ? "Completed" : "Remaining"]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                />
                <Legend formatter={(val) => val === "completed" ? "Completed" : "Remaining"} />
                <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="completed" />
                <Bar dataKey="remaining" stackId="a" fill="#fca5a5" radius={[0, 4, 4, 0]} name="remaining" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Best & Worst Performing Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base font-semibold text-slate-700">Best Performing Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {projectPerformance.best.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No task data available</p>
            ) : (
              <div className="space-y-3">
                {projectPerformance.best.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-amber-400 w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.completedTasks}/{p.totalTasks} tasks · {p.location}</p>
                      <div className="mt-1 h-2 bg-slate-100 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: `${p.completionPct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{p.completionPct}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <CardTitle className="text-base font-semibold text-slate-700">Least Performing Projects</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {projectPerformance.worst.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No task data available</p>
            ) : (
              <div className="space-y-3">
                {projectPerformance.worst.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-300 w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.completedTasks}/{p.totalTasks} tasks · {p.location}</p>
                      <div className="mt-1 h-2 bg-slate-100 rounded-full">
                        <div className="h-2 bg-red-400 rounded-full" style={{ width: `${p.completionPct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-red-500">{p.completionPct}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Center Performance */}
      {centerPerformance.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <CardTitle className="text-base font-semibold text-slate-700">Center / Location Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Location</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Projects</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Total Tasks</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Completed</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Remaining</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Completion</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {centerPerformance.map((c, i) => (
                    <tr key={c.location} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{c.location}</td>
                      <td className="px-3 py-2 text-slate-600">{c.projects}</td>
                      <td className="px-3 py-2 text-slate-600">{c.totalTasks}</td>
                      <td className="px-3 py-2 text-green-600 font-medium">{c.completedTasks}</td>
                      <td className="px-3 py-2 text-red-500 font-medium">{c.totalTasks - c.completedTasks}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full w-20">
                            <div className="h-2 rounded-full" style={{ width: `${c.completionPct}%`, backgroundColor: c.completionPct >= 75 ? "#22c55e" : c.completionPct >= 40 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="font-semibold text-slate-700">{c.completionPct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {i === 0 && <Badge className="bg-green-100 text-green-700 text-xs">Best</Badge>}
                        {i === centerPerformance.length - 1 && centerPerformance.length > 1 && (
                          <Badge className="bg-red-100 text-red-700 text-xs">Lowest</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project list summary */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">Filtered Projects Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Status</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Priority</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Mode</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Start</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800 max-w-xs truncate">{p.name}</td>
                    <td className="px-3 py-2">
                      <Badge style={{ backgroundColor: STATUS_COLORS[p.status], color: "#fff" }} className="capitalize text-xs">
                        {p.status?.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-600">{p.priority || "—"}</td>
                    <td className="px-3 py-2 text-slate-600 capitalize">{p.work_mode?.replace("_", " ")}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {p.start_date ? format(parseISO(p.start_date), "dd MMM yy") : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {p.end_date ? format(parseISO(p.end_date), "dd MMM yy") : "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No projects match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filtered.length > 20 && (
              <p className="text-xs text-slate-400 text-right mt-2">Showing first 20 of {filtered.length}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
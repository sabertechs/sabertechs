import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, CheckCircle, TrendingUp, UserX, Briefcase } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList
} from "recharts";

const PIPELINE_ORDER = [
  "Sourced","Called-Interested","Called-No Answer","Called-Not Interested",
  "Form Filled","Ops Confirmed","Test Passed","Test Failed",
  "Training Attended","BGV Initiated","Drive Ready"
];
const COLORS = ["#6366f1","#8b5cf6","#a78bfa","#818cf8","#4f46e5","#7c3aed","#c4b5fd","#ddd6fe","#ede9fe","#4338ca","#3730a3"];

export default function RecruitDashboard() {
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates-dash"],
    queryFn: () => base44.entities.Candidate.list(),
    staleTime: 2 * 60 * 1000,
  });
  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions-dash"],
    queryFn: () => base44.entities.Requisition.list(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-recruit"],
    queryFn: () => base44.entities.Employee.filter({ role: "hr" }),
    staleTime: 10 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const total = candidates.length;
    const contacted = candidates.filter(c => c.pipeline_status !== "Sourced").length;
    const driveReady = candidates.filter(c => c.pipeline_status === "Drive Ready").length;
    const unassigned = candidates.filter(c => !c.assigned_to).length;
    const conversion = total > 0 ? ((driveReady / total) * 100).toFixed(1) : 0;
    const openReqs = requisitions.filter(r => r.status === "Open").length;
    return { total, contacted, driveReady, unassigned, conversion, openReqs };
  }, [candidates, requisitions]);

  const sourceData = useMemo(() => {
    const counts = {};
    candidates.forEach(c => { counts[c.source || "Other"] = (counts[c.source || "Other"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [candidates]);

  const verticalData = useMemo(() => {
    const counts = {};
    candidates.forEach(c => { counts[c.vertical || "Unknown"] = (counts[c.vertical || "Unknown"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [candidates]);

  const funnelData = useMemo(() => {
    return PIPELINE_ORDER.map((status, i) => ({
      name: status,
      value: candidates.filter(c => c.pipeline_status === status).length,
      fill: COLORS[i % COLORS.length],
    }));
  }, [candidates]);

  const teamData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return employees.slice(0, 10).map(emp => {
      const assigned = candidates.filter(c => c.assigned_to === emp.email);
      const contactedToday = assigned.filter(c => {
        const log = c.activity_log || [];
        return log.some(l => l.timestamp?.startsWith(today) && l.to_status && l.to_status !== "Sourced");
      }).length;
      const driveReady = assigned.filter(c => c.pipeline_status === "Drive Ready").length;
      const conv = assigned.length > 0 ? ((driveReady / assigned.length) * 100).toFixed(0) : 0;
      return { name: emp.full_name, assigned: assigned.length, contactedToday, driveReady, conv };
    });
  }, [employees, candidates]);

  const metrics = [
    { label: "Total Candidates", value: stats.total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Contacted", value: stats.contacted, icon: Phone, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Drive Ready", value: stats.driveReady, icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Conversion %", value: `${stats.conversion}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Unassigned", value: stats.unassigned, icon: UserX, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "Open Requisitions", value: stats.openReqs, icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Recruitment Dashboard</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map(m => (
          <Card key={m.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{m.value}</div>
              <div className="text-xs text-slate-500 mt-1">{m.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Candidates by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vertical Pie Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Candidates by Vertical</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={verticalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {verticalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Pipeline Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {funnelData.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <div className="text-xs text-slate-500 w-32 truncate">{stage.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? Math.max((stage.value / stats.total) * 100, 2) : 0}%`, background: stage.fill }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-700 w-6 text-right">{stage.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Overview */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Team & Pipeline Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Name","Assigned","Contacted Today","Drive Ready","Conversion %"].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamData.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No team data yet</td></tr>
                ) : teamData.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-800">{m.name}</td>
                    <td className="py-2 px-3 text-slate-600">{m.assigned}</td>
                    <td className="py-2 px-3 text-slate-600">{m.contactedToday}</td>
                    <td className="py-2 px-3 text-slate-600">{m.driveReady}</td>
                    <td className="py-2 px-3">
                      <Badge className="bg-indigo-100 text-indigo-700 border-0">{m.conv}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, Users, CheckCircle, Phone } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const PIPELINE_STAGES = [
  "Sourced","Called-Interested","Called-No Answer","Called-Not Interested",
  "Form Filled","Ops Confirmed","Test Passed","Test Failed",
  "Training Attended","BGV Initiated","Drive Ready"
];
const COLORS = ["#6366f1","#8b5cf6","#a78bfa","#818cf8","#4f46e5","#7c3aed","#c4b5fd","#ddd6fe","#ede9fe","#4338ca","#3730a3"];

export default function RecruitReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => base44.entities.Candidate.list(),
    staleTime: 2 * 60 * 1000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-recruit-list"],
    queryFn: () => base44.entities.Employee.filter({ role: "hr" }),
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (dateFrom && c.created_date < dateFrom) return false;
      if (dateTo && c.created_date > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [candidates, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const contacted = filtered.filter(c => c.pipeline_status !== "Sourced").length;
    const driveReady = filtered.filter(c => c.pipeline_status === "Drive Ready").length;
    const conv = total > 0 ? ((driveReady / total) * 100).toFixed(1) : 0;
    return { total, contacted, driveReady, conv };
  }, [filtered]);

  const sourceData = useMemo(() => {
    const counts = {};
    filtered.forEach(c => { counts[c.source || "Other"] = (counts[c.source || "Other"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const verticalData = useMemo(() => {
    const counts = {};
    filtered.forEach(c => { counts[c.vertical || "Unknown"] = (counts[c.vertical || "Unknown"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const sourceQuality = useMemo(() => {
    const sources = ["Naukri","Indeed","WhatsApp","Reference","Other"];
    return sources.map(source => {
      const group = filtered.filter(c => (c.source || "Other") === source);
      const total = group.length;
      const contacted = group.filter(c => c.pipeline_status !== "Sourced").length;
      const driveReady = group.filter(c => c.pipeline_status === "Drive Ready").length;
      return {
        source,
        total,
        contactedPct: total > 0 ? ((contacted / total) * 100).toFixed(0) : 0,
        driveReadyPct: total > 0 ? ((driveReady / total) * 100).toFixed(0) : 0,
        convPct: total > 0 ? ((driveReady / total) * 100).toFixed(0) : 0,
      };
    }).filter(r => r.total > 0);
  }, [filtered]);

  const tatData = useMemo(() => {
    const stageDays = {};
    PIPELINE_STAGES.forEach(s => { stageDays[s] = []; });
    filtered.forEach(c => {
      const log = c.activity_log || [];
      for (let i = 1; i < log.length; i++) {
        const prev = log[i-1];
        const curr = log[i];
        if (curr.from_status && curr.to_status && curr.timestamp && prev.timestamp) {
          const days = (new Date(curr.timestamp) - new Date(prev.timestamp)) / (1000 * 60 * 60 * 24);
          if (!stageDays[curr.from_status]) stageDays[curr.from_status] = [];
          stageDays[curr.from_status].push(days);
        }
      }
    });
    return PIPELINE_STAGES.map(stage => ({
      stage: stage.length > 14 ? stage.slice(0,14) + "…" : stage,
      avgDays: stageDays[stage]?.length > 0
        ? (stageDays[stage].reduce((a, b) => a + b, 0) / stageDays[stage].length).toFixed(1)
        : 0
    })).filter(s => s.avgDays > 0);
  }, [filtered]);

  const teamPerf = useMemo(() => {
    return employees.slice(0,10).map(emp => {
      const assigned = filtered.filter(c => c.assigned_to === emp.email);
      const contacted = assigned.filter(c => c.pipeline_status !== "Sourced").length;
      const driveReady = assigned.filter(c => c.pipeline_status === "Drive Ready").length;
      const conv = assigned.length > 0 ? ((driveReady / assigned.length) * 100).toFixed(0) : 0;
      return { name: emp.full_name, assigned: assigned.length, contacted, driveReady, conv };
    }).filter(m => m.assigned > 0);
  }, [employees, filtered]);

  const exportCSV = () => {
    const rows = [["Name","Phone","Email","City","Vertical","Source","Status","Assigned To","Date Added"]];
    filtered.forEach(c => {
      rows.push([c.full_name,c.phone,c.email||"",c.city||"",c.vertical||"",c.source||"",c.pipeline_status||"",c.assigned_to||"",c.created_date||""]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "candidates_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />Export CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-600">Date range:</span>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
        <span className="text-slate-400">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-slate-400 h-8 text-xs">Clear</Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Candidates", value: stats.total, icon: Users },
          { label: "Contacted", value: stats.contacted, icon: Phone },
          { label: "Drive Ready", value: stats.driveReady, icon: CheckCircle },
          { label: "Conversion %", value: `${stats.conv}%`, icon: TrendingUp },
        ].map(m => (
          <Card key={m.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <m.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">{m.value}</div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="source">Source Quality</TabsTrigger>
          <TabsTrigger value="tat">TAT Report</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Candidates by Source</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Candidates by Vertical</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={verticalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {verticalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="source" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Source","Total Leads","Contacted %","Drive Ready %","Conversion %"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourceQuality.map(row => (
                  <tr key={row.source} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{row.source}</td>
                    <td className="py-3 px-4 text-slate-600">{row.total}</td>
                    <td className="py-3 px-4"><Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{row.contactedPct}%</Badge></td>
                    <td className="py-3 px-4"><Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{row.driveReadyPct}%</Badge></td>
                    <td className="py-3 px-4"><Badge className="bg-purple-100 text-purple-700 border-0 text-xs">{row.convPct}%</Badge></td>
                  </tr>
                ))}
                {sourceQuality.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="tat" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Average Days per Pipeline Stage</CardTitle></CardHeader>
            <CardContent>
              {tatData.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Not enough activity data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={tatData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "Avg Days", position: "insideBottom", offset: -5, fontSize: 11 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#8b5cf6" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Member","Assigned","Contacted","Drive Ready","Conversion %"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamPerf.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{m.name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.assigned}</td>
                    <td className="py-3 px-4 text-slate-600">{m.contacted}</td>
                    <td className="py-3 px-4 text-indigo-700 font-medium">{m.driveReady}</td>
                    <td className="py-3 px-4"><Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{m.conv}%</Badge></td>
                  </tr>
                ))}
                {teamPerf.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No team data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
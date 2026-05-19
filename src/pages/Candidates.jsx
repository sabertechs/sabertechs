import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Upload, Search, Phone } from "lucide-react";
import { format } from "date-fns";
import CandidatePanel from "@/components/recruitment/CandidatePanel";
import AddCandidateModal from "@/components/recruitment/AddCandidateModal";
import CSVImportWizard from "@/components/recruitment/CSVImportWizard";

const STATUS_COLORS = {
  "Sourced": "bg-slate-100 text-slate-600",
  "Called-Interested": "bg-blue-100 text-blue-700",
  "Called-No Answer": "bg-yellow-100 text-yellow-700",
  "Called-Not Interested": "bg-red-100 text-red-700",
  "Form Filled": "bg-purple-100 text-purple-700",
  "Ops Confirmed": "bg-indigo-100 text-indigo-700",
  "Test Passed": "bg-emerald-100 text-emerald-700",
  "Test Failed": "bg-rose-100 text-rose-700",
  "Training Attended": "bg-cyan-100 text-cyan-700",
  "BGV Initiated": "bg-orange-100 text-orange-700",
  "Drive Ready": "bg-violet-100 text-violet-700",
};

export default function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ vertical:"", source:"", status:"", assigned_to:"", drive_linked:"" });
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const { data: candidates = [], refetch } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => base44.entities.Candidate.list("-created_date"),
    staleTime: 60 * 1000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-recruit"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-recruit-list"],
    queryFn: () => base44.entities.Employee.filter({ role: "hr" }),
    staleTime: 10 * 60 * 1000,
  });

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!c.full_name?.toLowerCase().includes(s) && !c.phone?.includes(s) && !c.email?.toLowerCase().includes(s)) return false;
      }
      if (filters.vertical && c.vertical !== filters.vertical) return false;
      if (filters.source && c.source !== filters.source) return false;
      if (filters.status && c.pipeline_status !== filters.status) return false;
      if (filters.assigned_to && c.assigned_to !== filters.assigned_to) return false;
      if (filters.drive_linked && c.drive_linked !== filters.drive_linked) return false;
      return true;
    });
  }, [candidates, search, filters]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Candidate Pool</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2 text-sm">
            <Upload className="w-4 h-4" />Import CSV
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm">
            <UserPlus className="w-4 h-4" />Add Candidate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        {[
          { key: "vertical", placeholder: "Vertical", options: ["Invigilator","Centre Supervisor","Online Proctor"] },
          { key: "source", placeholder: "Source", options: ["Naukri","Indeed","WhatsApp","Reference","Other"] },
          { key: "status", placeholder: "Status", options: ["Sourced","Called-Interested","Called-No Answer","Called-Not Interested","Form Filled","Ops Confirmed","Test Passed","Test Failed","Training Attended","BGV Initiated","Drive Ready"] },
        ].map(({ key, placeholder, options }) => (
          <Select key={key} value={filters[key] || "all"} onValueChange={v => setFilter(key, v === "all" ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {placeholder}s</SelectItem>
              {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <Select value={filters.assigned_to || "all"} onValueChange={v => setFilter("assigned_to", v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {employees.map(e => <SelectItem key={e.email} value={e.email}>{e.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.drive_linked || "all"} onValueChange={v => setFilter("drive_linked", v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Drive" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drives</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {Object.values(filters).some(Boolean) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ vertical:"",source:"",status:"",assigned_to:"",drive_linked:"" })} className="text-slate-400 h-8 text-xs">Clear</Button>
        )}
      </div>

      <div className="text-xs text-slate-500">{filtered.length} candidate{filtered.length !== 1 ? "s" : ""}</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Name","Phone","City","Vertical","Source","Pipeline Status","Assigned To","Date Added"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">No candidates found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{c.full_name}</div>
                    {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-indigo-600 hover:underline">
                      <Phone className="w-3 h-3" />{c.phone}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.city || "—"}</td>
                  <td className="py-3 px-4">{c.vertical ? <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{c.vertical}</Badge> : "—"}</td>
                  <td className="py-3 px-4 text-slate-600">{c.source || "—"}</td>
                  <td className="py-3 px-4">
                    <Badge className={`border-0 text-xs ${STATUS_COLORS[c.pipeline_status] || "bg-slate-100 text-slate-600"}`}>
                      {c.pipeline_status || "Sourced"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{c.assigned_to || "—"}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{c.created_date ? format(new Date(c.created_date), "dd MMM yy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <CandidatePanel
          candidate={selected}
          onClose={() => setSelected(null)}
          onUpdate={updated => setSelected(updated)}
          currentUser={currentUser}
        />
      )}

      <AddCandidateModal open={showAdd} onClose={() => setShowAdd(false)} projects={projects} employees={employees} currentUser={currentUser} />
      <CSVImportWizard open={showImport} onClose={() => setShowImport(false)} currentUser={currentUser} />
    </div>
  );
}
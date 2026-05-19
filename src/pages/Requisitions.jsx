import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MapPin, Users, Target } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RequisitionsPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title:"", drive_linked:"", drive_name:"", role:"", location:"", target_count:"", status:"Open" });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions"],
    queryFn: () => base44.entities.Requisition.list("-created_date"),
    staleTime: 2 * 60 * 1000,
  });
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => base44.entities.Candidate.list(),
    staleTime: 2 * 60 * 1000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-recruit"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });

  const getConfirmed = (req) =>
    candidates.filter(c => c.drive_linked === req.drive_linked && c.pipeline_status === "Drive Ready").length;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.role) return;
    setSaving(true);
    try {
      await base44.entities.Requisition.create({ ...form, target_count: Number(form.target_count) || 0 });
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast({ title: "Requisition created" });
      setShowNew(false);
      setForm({ title:"",drive_linked:"",drive_name:"",role:"",location:"",target_count:"",status:"Open" });
    } catch {
      toast({ title: "Error creating requisition", variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleStatus = async (req) => {
    const newStatus = req.status === "Open" ? "Closed" : "Open";
    await base44.entities.Requisition.update(req.id, { status: newStatus });
    qc.invalidateQueries({ queryKey: ["requisitions"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Requisitions</h2>
        <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" />New Requisition
        </Button>
      </div>

      {requisitions.length === 0 && (
        <div className="text-center py-16 text-slate-400">No requisitions yet. Create one to track hiring targets.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requisitions.map(req => {
          const confirmed = getConfirmed(req);
          const target = req.target_count || 1;
          const pct = Math.min(100, Math.round((confirmed / target) * 100));
          const open = Math.max(0, target - confirmed);
          return (
            <div key={req.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{req.title}</h3>
                  {req.drive_name && <p className="text-xs text-slate-400 mt-0.5">{req.drive_name}</p>}
                </div>
                <Badge
                  className={`border-0 cursor-pointer text-xs ${req.status === "Open" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                  onClick={() => toggleStatus(req)}
                >
                  {req.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 mb-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />{req.role}
                </span>
                {req.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />{req.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-slate-400" />Target: {target}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{confirmed} Confirmed</span>
                  <span>{open} Open</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-indigo-500" : "bg-gradient-to-r from-indigo-400 to-purple-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 text-right">{pct}% filled</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Requisition Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. BITS Bangalore June 2026" required />
            </div>
            <div>
              <Label className="text-xs">Drive Linked</Label>
              <Select value={form.drive_linked} onValueChange={v => { const p = projects.find(p => p.id === v); set("drive_linked", v); set("drive_name", p?.name || ""); }}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Link to a drive" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Role *</Label>
              <Select value={form.role} onValueChange={v => set("role", v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{["Invigilator","Centre Supervisor","Online Proctor"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={form.location} onChange={e => set("location", e.target.value)} className="mt-1 h-8 text-sm" placeholder="City" />
            </div>
            <div>
              <Label className="text-xs">Target Count</Label>
              <Input type="number" value={form.target_count} onChange={e => set("target_count", e.target.value)} className="mt-1 h-8 text-sm" placeholder="How many needed?" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowNew(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
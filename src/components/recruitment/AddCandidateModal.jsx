import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function AddCandidateModal({ open, onClose, projects = [], employees = [], currentUser }) {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", city: "",
    vertical: "", source: "", drive_linked: "", drive_name: "", assigned_to: "",
    pipeline_status: "Sourced"
  });
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone) return;
    setSaving(true);
    try {
      const activity_log = [{
        timestamp: new Date().toISOString(),
        action: "Candidate added",
        by: currentUser?.email || "Unknown",
        from_status: null,
        to_status: "Sourced"
      }];
      await base44.entities.Candidate.create({ ...form, activity_log });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-dash"] });
      toast({ title: "Candidate added successfully" });
      onClose();
      setForm({ full_name:"",phone:"",email:"",city:"",vertical:"",source:"",drive_linked:"",drive_name:"",assigned_to:"",pipeline_status:"Sourced" });
    } catch (e) {
      toast({ title: "Error adding candidate", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: "Full Name *", key: "full_name", type: "text" },
            { label: "Phone *", key: "phone", type: "tel" },
            { label: "Email", key: "email", type: "email" },
            { label: "City", key: "city", type: "text" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input type={type} value={form[key]} onChange={e => set(key, e.target.value)} className="mt-1 h-8 text-sm" required={label.includes("*")} />
            </div>
          ))}
          <div>
            <Label className="text-xs">Vertical</Label>
            <Select value={form.vertical} onValueChange={v => set("vertical", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select vertical" /></SelectTrigger>
              <SelectContent>
                {["Invigilator","Centre Supervisor","Online Proctor"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={form.source} onValueChange={v => set("source", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {["Naukri","Indeed","WhatsApp","Reference","Other"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Drive Linked</Label>
            <Select value={form.drive_linked} onValueChange={v => {
              const p = projects.find(p => p.id === v);
              set("drive_linked", v);
              set("drive_name", p?.name || "");
            }}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Link to drive" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Assigned To</Label>
            <Select value={form.assigned_to} onValueChange={v => set("assigned_to", v)}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Assign to team member" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.email} value={e.email}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Adding..." : "Add Candidate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
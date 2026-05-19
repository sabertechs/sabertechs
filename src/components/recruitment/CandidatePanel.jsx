import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Phone, Mail, MapPin, Calendar, Clock, FileText, Activity, CheckSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

const PIPELINE_STAGES = [
  "Sourced","Called-Interested","Called-No Answer","Called-Not Interested",
  "Form Filled","Ops Confirmed","Test Passed","Test Failed",
  "Training Attended","BGV Initiated","Drive Ready"
];

const STATUS_COLORS = {
  "Sourced": "bg-slate-100 text-slate-700",
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

export default function CandidatePanel({ candidate, onClose, onUpdate, currentUser }) {
  const [data, setData] = useState(candidate);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => { setData(candidate); }, [candidate]);

  const save = async (updates) => {
    setSaving(true);
    try {
      const updated = await base44.entities.Candidate.update(data.id, updates);
      setData({ ...data, ...updates });
      onUpdate && onUpdate({ ...data, ...updates });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["candidates-dash"] });
    } catch(e) {
      toast({ title: "Error saving", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus) => {
    const log = data.activity_log || [];
    const entry = {
      timestamp: new Date().toISOString(),
      action: "Status changed",
      by: currentUser?.email || "Unknown",
      from_status: data.pipeline_status,
      to_status: newStatus,
    };
    await save({ pipeline_status: newStatus, activity_log: [...log, entry] });
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const notes = data.call_notes || "";
    const timestamp = format(new Date(), "dd MMM yyyy HH:mm");
    const entry = `[${timestamp} — ${currentUser?.full_name || "User"}] ${newNote}`;
    const updated = notes ? `${notes}\n${entry}` : entry;
    await save({ call_notes: updated });
    setNewNote("");
  };

  const toggleDoc = async (field) => {
    await save({ [field]: !data[field] });
  };

  if (!data) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{data.full_name}</h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-sm text-slate-500"><Phone className="w-3 h-3" />{data.phone}</span>
            {data.email && <span className="flex items-center gap-1 text-sm text-slate-500"><Mail className="w-3 h-3" />{data.email}</span>}
            {data.city && <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="w-3 h-3" />{data.city}</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
      </div>

      {/* Status */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
        <span className="text-sm text-slate-500">Pipeline Status:</span>
        <Select value={data.pipeline_status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STAGES.map(s => (
              <SelectItem key={s} value={s}>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s]}`}>{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.vertical && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{data.vertical}</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="details" className="h-full">
          <TabsList className="w-full rounded-none border-b border-slate-100 bg-white px-5 justify-start gap-2 h-10">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Call Notes</TabsTrigger>
            <TabsTrigger value="callback" className="text-xs">Callback</TabsTrigger>
            <TabsTrigger value="docs" className="text-xs">Documents</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          {/* Details */}
          <TabsContent value="details" className="p-5 space-y-4">
            {[
              { label: "Full Name", field: "full_name", type: "text" },
              { label: "Phone", field: "phone", type: "text" },
              { label: "Email", field: "email", type: "email" },
              { label: "City", field: "city", type: "text" },
              { label: "Aadhaar Number", field: "aadhar_number", type: "text" },
              { label: "Address", field: "address", type: "text" },
              { label: "Current Occupation", field: "current_occupation", type: "text" },
              { label: "Experience (years)", field: "experience_years", type: "number" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="text-xs font-medium text-slate-500">{label}</label>
                <Input
                  type={type}
                  value={data[field] || ""}
                  onChange={e => setData({ ...data, [field]: e.target.value })}
                  onBlur={e => save({ [field]: e.target.value })}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            ))}
            {[
              { label: "Gender", field: "gender", options: ["Male","Female","Other"] },
              { label: "Qualification", field: "qualification", options: ["Graduate","Post Graduate","PhD","Other"] },
              { label: "Vertical", field: "vertical", options: ["Invigilator","Centre Supervisor","Online Proctor"] },
              { label: "Source", field: "source", options: ["Naukri","Indeed","WhatsApp","Reference","Other"] },
            ].map(({ label, field, options }) => (
              <div key={field}>
                <label className="text-xs font-medium text-slate-500">{label}</label>
                <Select value={data[field] || ""} onValueChange={v => save({ [field]: v })}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
                  <SelectContent>
                    {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="inv_before" checked={!!data.worked_as_invigilator_before}
                onChange={e => save({ worked_as_invigilator_before: e.target.checked })} />
              <label htmlFor="inv_before" className="text-sm text-slate-700">Worked as invigilator before</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="avail" checked={!!data.available_on_drive_date}
                onChange={e => save({ available_on_drive_date: e.target.checked })} />
              <label htmlFor="avail" className="text-sm text-slate-700">Available on drive date</label>
            </div>
          </TabsContent>

          {/* Call Notes */}
          <TabsContent value="notes" className="p-5 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a call note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNote()}
                className="flex-1 text-sm"
              />
              <Button size="sm" onClick={addNote} className="bg-indigo-600 hover:bg-indigo-700">Add</Button>
            </div>
            <div className="space-y-2">
              {(data.call_notes || "").split("\n").filter(Boolean).reverse().map((note, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">{note}</div>
              ))}
              {!data.call_notes && <p className="text-sm text-slate-400 text-center py-4">No notes yet</p>}
            </div>
          </TabsContent>

          {/* Callback */}
          <TabsContent value="callback" className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Callback Date</label>
              <Input type="date" value={data.callback_date || ""} onChange={e => setData({ ...data, callback_date: e.target.value })}
                onBlur={e => save({ callback_date: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Callback Time</label>
              <Input type="time" value={data.callback_time || ""} onChange={e => setData({ ...data, callback_time: e.target.value })}
                onBlur={e => save({ callback_time: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
            {data.callback_date && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-sm text-indigo-700 font-medium">Scheduled: {data.callback_date} {data.callback_time && `at ${data.callback_time}`}</p>
              </div>
            )}
          </TabsContent>

          {/* Documents */}
          <TabsContent value="docs" className="p-5 space-y-3">
            {[
              { label: "ID Proof", field: "id_proof_uploaded" },
              { label: "Address Proof", field: "address_proof_uploaded" },
              { label: "Photo", field: "photo_uploaded" },
              { label: "Resume", field: "resume_uploaded" },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckSquare className={`w-4 h-4 ${data[field] ? "text-indigo-600" : "text-slate-300"}`} />
                  <span className="text-sm text-slate-700">{label}</span>
                </div>
                <Button size="sm" variant={data[field] ? "default" : "outline"} onClick={() => toggleDoc(field)}
                  className={data[field] ? "bg-indigo-600 hover:bg-indigo-700 h-7 text-xs" : "h-7 text-xs"}>
                  {data[field] ? "Uploaded" : "Mark Uploaded"}
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="p-5">
            <div className="space-y-3">
              {(data.activity_log || []).slice().reverse().map((log, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700">{log.action}
                      {log.from_status && <span className="text-slate-400"> from <span className="font-medium text-slate-600">{log.from_status}</span></span>}
                      {log.to_status && <span className="text-slate-400"> to <span className="font-medium text-indigo-600">{log.to_status}</span></span>}
                    </p>
                    <p className="text-xs text-slate-400">{log.by} · {log.timestamp ? format(new Date(log.timestamp), "dd MMM yyyy HH:mm") : ""}</p>
                  </div>
                </div>
              ))}
              {(!data.activity_log || data.activity_log.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
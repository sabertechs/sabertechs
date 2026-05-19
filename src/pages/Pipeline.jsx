import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { LayoutGrid, List, Phone as PhoneIcon, Calendar } from "lucide-react";
import { format } from "date-fns";
import CandidatePanel from "@/components/recruitment/CandidatePanel";

const PIPELINE_STAGES = [
  "Sourced","Called-Interested","Called-No Answer","Called-Not Interested",
  "Form Filled","Ops Confirmed","Test Passed","Test Failed",
  "Training Attended","BGV Initiated","Drive Ready"
];

const STAGE_COLORS = {
  "Sourced": "bg-slate-100 border-slate-200",
  "Called-Interested": "bg-blue-50 border-blue-200",
  "Called-No Answer": "bg-yellow-50 border-yellow-200",
  "Called-Not Interested": "bg-red-50 border-red-200",
  "Form Filled": "bg-purple-50 border-purple-200",
  "Ops Confirmed": "bg-indigo-50 border-indigo-200",
  "Test Passed": "bg-emerald-50 border-emerald-200",
  "Test Failed": "bg-rose-50 border-rose-200",
  "Training Attended": "bg-cyan-50 border-cyan-200",
  "BGV Initiated": "bg-orange-50 border-orange-200",
  "Drive Ready": "bg-violet-50 border-violet-200",
};

const BADGE_COLORS = {
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

export default function PipelinePage() {
  const [view, setView] = useState("board");
  const [driveFilter, setDriveFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const qc = useQueryClient();

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => base44.entities.Candidate.list("-created_date"),
    staleTime: 60 * 1000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-recruit"],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const filtered = useMemo(() =>
    driveFilter ? candidates.filter(c => c.drive_linked === driveFilter) : candidates,
    [candidates, driveFilter]
  );

  const byStage = useMemo(() => {
    const map = {};
    PIPELINE_STAGES.forEach(s => { map[s] = []; });
    filtered.forEach(c => {
      const stage = c.pipeline_status || "Sourced";
      if (map[stage]) map[stage].push(c);
    });
    return map;
  }, [filtered]);

  const callbacks = useMemo(() =>
    filtered.filter(c => c.callback_date).sort((a, b) => {
      const da = `${a.callback_date} ${a.callback_time || "00:00"}`;
      const db = `${b.callback_date} ${b.callback_time || "00:00"}`;
      return da.localeCompare(db);
    }),
    [filtered]
  );

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || source.droppableId === destination.droppableId) return;
    const newStatus = destination.droppableId;
    const candidate = candidates.find(c => c.id === draggableId);
    if (!candidate) return;
    const log = candidate.activity_log || [];
    const entry = {
      timestamp: new Date().toISOString(),
      action: "Status changed",
      by: currentUser?.email || "Unknown",
      from_status: candidate.pipeline_status,
      to_status: newStatus,
    };
    await base44.entities.Candidate.update(draggableId, { pipeline_status: newStatus, activity_log: [...log, entry] });
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["candidates-dash"] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Pipeline</h2>
        <div className="flex items-center gap-3">
          <Select value={driveFilter || "all"} onValueChange={v => setDriveFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Drives" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drives</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            {[
              { id: "board", icon: LayoutGrid },
              { id: "list", icon: List },
              { id: "callbacks", icon: Calendar },
            ].map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className={`px-3 py-1.5 ${view === id ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board View */}
      {view === "board" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage => (
              <Droppable droppableId={stage} key={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-52 rounded-xl border-2 ${STAGE_COLORS[stage]} ${snapshot.isDraggingOver ? "ring-2 ring-indigo-400" : ""} transition-all`}
                  >
                    <div className="px-3 py-2 border-b border-current/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 truncate">{stage}</span>
                        <Badge className="bg-white/80 text-slate-600 border-0 text-xs px-1.5 min-w-5 text-center">{byStage[stage]?.length || 0}</Badge>
                      </div>
                    </div>
                    <div className="p-2 space-y-2 min-h-24 max-h-96 overflow-y-auto">
                      {(byStage[stage] || []).map((c, i) => (
                        <Draggable draggableId={c.id} index={i} key={c.id}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setSelected(c)}
                              className={`bg-white rounded-lg p-2.5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all text-xs ${snap.isDragging ? "shadow-lg rotate-1" : ""}`}
                            >
                              <div className="font-semibold text-slate-800 truncate">{c.full_name}</div>
                              <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                                <PhoneIcon className="w-2.5 h-2.5" />{c.phone}
                              </div>
                              {c.city && <div className="text-slate-400 mt-0.5">{c.city}</div>}
                              {c.vertical && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs mt-1">{c.vertical}</Badge>}
                              {c.drive_name && <div className="text-slate-400 mt-0.5 truncate">{c.drive_name}</div>}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {PIPELINE_STAGES.filter(s => byStage[s]?.length > 0).map(stage => (
            <div key={stage} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className={`px-4 py-2 border-b border-slate-100 flex items-center gap-2 ${STAGE_COLORS[stage]}`}>
                <span className="text-sm font-semibold text-slate-700">{stage}</span>
                <Badge className="bg-white/80 text-slate-600 border-0 text-xs">{byStage[stage].length}</Badge>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {byStage[stage].map(c => (
                    <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                      <td className="py-2 px-4 font-medium text-slate-800">{c.full_name}</td>
                      <td className="py-2 px-4 text-slate-500">{c.phone}</td>
                      <td className="py-2 px-4 text-slate-400">{c.city || "—"}</td>
                      <td className="py-2 px-4">{c.vertical && <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">{c.vertical}</Badge>}</td>
                      <td className="py-2 px-4 text-slate-400 text-xs">{c.drive_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No candidates in pipeline</div>}
        </div>
      )}

      {/* Callbacks View */}
      {view === "callbacks" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{callbacks.length} callback(s) scheduled</p>
          {callbacks.length === 0 && <div className="text-center py-12 text-slate-400">No callbacks scheduled</div>}
          {callbacks.map(c => (
            <div key={c.id} onClick={() => setSelected(c)}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-colors">
              <div>
                <div className="font-semibold text-slate-800">{c.full_name}</div>
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                  <PhoneIcon className="w-3 h-3" />{c.phone}
                  {c.city && <span>· {c.city}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-indigo-700">
                  {c.callback_date} {c.callback_time && `at ${c.callback_time}`}
                </div>
                <Badge className={`mt-1 border-0 text-xs ${BADGE_COLORS[c.pipeline_status] || "bg-slate-100 text-slate-600"}`}>{c.pipeline_status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <CandidatePanel
          candidate={selected}
          onClose={() => setSelected(null)}
          onUpdate={updated => setSelected(updated)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
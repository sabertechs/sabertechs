import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, eachDayOfInterval, parseISO, isValid, isFuture, isToday } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Users, CheckCircle, XCircle } from "lucide-react";

export default function ProjectAttendanceDialog({ project, open, onOpenChange }) {
  // Fetch all tasks for the project (paginated to bypass ~100 record cap)
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["project-att-tasks", project?.id],
    queryFn: async () => {
      const all = [];
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = await base44.entities.ProjectTask.filter(
          { project_id: project.id }, "created_date", pageSize, skip
        );
        all.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return all;
    },
    enabled: !!open && !!project?.id,
  });

  // Accepted applications = assigned freelancers
  const { data: applications = [] } = useQuery({
    queryKey: ["project-att-apps", project?.id],
    queryFn: () =>
      base44.entities.ProjectApplication.filter({ project_id: project.id, status: "accepted" }),
    enabled: !!open && !!project?.id,
  });

  // Fetch all responses for the project (paginated)
  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ["project-att-responses", project?.id],
    queryFn: async () => {
      const all = [];
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = await base44.entities.TaskResponse.filter(
          { project_id: project.id }, "-created_date", pageSize, skip
        );
        all.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return all;
    },
    enabled: !!open && !!project?.id,
  });

  // Attendance tasks: titles indicating selfie / attendance / geotag check-in
  const attendanceTaskIds = useMemo(
    () => new Set(
      tasks.filter((t) => /selfie|attendance|geotag/i.test(t.title || "")).map((t) => t.id)
    ),
    [tasks]
  );

  // Actual project days (start_date → end_date inclusive)
  const actualDays = useMemo(() => {
    if (!project?.start_date || !project?.end_date) return [];
    const start = parseISO(project.start_date);
    const end = parseISO(project.end_date);
    if (!isValid(start) || !isValid(end) || start > end) return [];
    return eachDayOfInterval({ start, end });
  }, [project?.start_date, project?.end_date]);

  const assignedEmails = useMemo(
    () => applications.map((a) => a.freelancer_email).filter(Boolean),
    [applications]
  );

  // Map: dateStr -> Set of freelancer emails who checked in on that day
  const dailyCheckins = useMemo(() => {
    const map = {};
    responses.forEach((r) => {
      if (!attendanceTaskIds.has(r.task_id)) return;
      if (!r.submission_date) return;
      const d = format(new Date(r.submission_date), "yyyy-MM-dd");
      if (!map[d]) map[d] = new Set();
      map[d].add(r.freelancer_email);
    });
    return map;
  }, [responses, attendanceTaskIds]);

  const loading = loadingTasks || loadingResponses;

  // Overall summary across actual days (only past/today days count toward expected)
  const summary = useMemo(() => {
    const today = new Date();
    let totalExpected = 0; // assigned * elapsed days
    let totalPresent = 0;
    actualDays.forEach((day) => {
      if (isFuture(day) && !isToday(day)) return; // skip future days
      totalExpected += assignedEmails.length;
      const presentSet = dailyCheckins[format(day, "yyyy-MM-dd")] || new Set();
      totalPresent += [...presentSet].filter((e) => assignedEmails.includes(e)).length;
    });
    const rate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
    return { totalExpected, totalPresent, rate };
  }, [actualDays, assignedEmails, dailyCheckins]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Attendance — {project?.name}
          </DialogTitle>
          <DialogDescription>
            Per-day attendance across the project's actual running days
            ({project?.start_date ? format(parseISO(project.start_date), "MMM d, yyyy") : "-"} –{" "}
            {project?.end_date ? format(parseISO(project.end_date), "MMM d, yyyy") : "-"})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : attendanceTaskIds.size === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-600">No attendance task found</p>
            <p className="text-sm">
              Create a task named "Selfie", "Attendance", or "Geotag Selfie" to track centre attendance.
            </p>
          </div>
        ) : actualDays.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p>No valid project date range to show attendance.</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-slate-800">{assignedEmails.length}</div>
                <div className="text-xs text-slate-500">Assigned</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-slate-800">{summary.totalPresent}</div>
                <div className="text-xs text-slate-500">Total Check-ins</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-center">
                <XCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-slate-800">{summary.rate}%</div>
                <div className="text-xs text-slate-500">Attendance Rate</div>
              </div>
            </div>

            {/* Per-day table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Date", "Day", "Assigned", "Present", "Absent", "Rate"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actualDays.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const presentSet = dailyCheckins[dateStr] || new Set();
                    const present = [...presentSet].filter((e) => assignedEmails.includes(e)).length;
                    const assigned = assignedEmails.length;
                    const absent = assigned - present;
                    const rate = assigned > 0 ? Math.round((present / assigned) * 100) : 0;
                    const upcoming = isFuture(day) && !isToday(day);
                    return (
                      <tr key={dateStr} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                          {format(day, "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{format(day, "EEE")}</td>
                        <td className="px-4 py-2.5 text-slate-600">{assigned}</td>
                        <td className="px-4 py-2.5">
                          {upcoming ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">{present}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {upcoming ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">{absent}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {upcoming ? (
                            <span className="text-slate-400 text-xs">upcoming</span>
                          ) : (
                            <span className="font-medium text-slate-700">{rate}%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Attendance is derived from submitted responses to attendance-type tasks
              (Selfie / Attendance / Geotag). Future days are marked as upcoming.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
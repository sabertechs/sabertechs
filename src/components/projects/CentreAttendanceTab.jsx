import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, XCircle, Camera, Send, Loader2, Image as ImageIcon, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function CentreAttendanceTab({ projectId, project }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);

  // Fetch all tasks for the project (paginated to bypass ~100 record cap)
  const { data: allTasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: async () => {
      const all = [];
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = await base44.entities.ProjectTask.filter({ project_id: projectId }, 'created_date', pageSize, skip);
        all.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return all;
    },
    enabled: !!projectId
  });

  // Fetch accepted applications (assigned freelancers)
  const { data: applications = [] } = useQuery({
    queryKey: ['projectApplications-accepted', projectId],
    queryFn: () => base44.entities.ProjectApplication.filter({ project_id: projectId, status: 'accepted' }),
    enabled: !!projectId
  });

  // Fetch all responses for the project (paginated)
  const { data: responses = [] } = useQuery({
    queryKey: ['taskResponses', projectId],
    queryFn: async () => {
      const all = [];
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = await base44.entities.TaskResponse.filter({ project_id: projectId }, '-created_date', pageSize, skip);
        all.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return all;
    },
    enabled: !!projectId
  });

  // Auto-detect selfie/attendance tasks (image_upload type)
  const attendanceTasks = useMemo(() => allTasks.filter(t => t.task_type === 'image_upload'), [allTasks]);

  useEffect(() => {
    if (!selectedTaskId && attendanceTasks.length > 0) {
      setSelectedTaskId(attendanceTasks[0].id);
    }
  }, [attendanceTasks, selectedTaskId]);

  // Assigned freelancers from accepted applications
  const assignedFreelancers = useMemo(() =>
    applications.map(a => ({
      email: a.freelancer_email,
      name: a.freelancer_name,
      phone: a.freelancer_phone
    })), [applications]);

  // Check if a freelancer has submitted on the selected date for the selected task
  const hasCheckedIn = (email) => {
    return responses.some(r =>
      r.task_id === selectedTaskId &&
      r.freelancer_email === email &&
      r.submission_date &&
      format(new Date(r.submission_date), 'yyyy-MM-dd') === selectedDate
    );
  };

  const present = assignedFreelancers.filter(f => hasCheckedIn(f.email));
  const absent = assignedFreelancers.filter(f => !hasCheckedIn(f.email));
  const attendanceRate = assignedFreelancers.length > 0
    ? Math.round((present.length / assignedFreelancers.length) * 100)
    : 0;

  // Get the response for a freelancer (for viewing the selfie)
  const getResponse = (email) => {
    return responses.find(r =>
      r.task_id === selectedTaskId &&
      r.freelancer_email === email &&
      r.submission_date &&
      format(new Date(r.submission_date), 'yyyy-MM-dd') === selectedDate
    );
  };

  // Send WhatsApp reminders to absent freelancers
  const sendReminders = async () => {
    const remindable = absent.filter(f => f.phone);
    if (remindable.length === 0) {
      toast.error('No phone numbers available for absent freelancers');
      return;
    }
    setSendingReminders(true);
    let successCount = 0;
    for (const freelancer of remindable) {
      try {
        await base44.functions.invoke('sendWhatsApp', {
          phone: freelancer.phone,
          message: `Hello ${freelancer.name}, this is a reminder to submit your selfie/attendance for "${project.name}" on ${format(new Date(selectedDate), 'MMM d, yyyy')}. Please complete it in the app.`
        });
        successCount++;
      } catch (e) {
        console.error('Failed to send to', freelancer.phone, e);
      }
    }
    setSendingReminders(false);
    toast.success(`Reminders sent to ${successCount} of ${remindable.length} freelancer(s)`);
  };

  if (attendanceTasks.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No Attendance Task Found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Create an image upload task (e.g. "Selfie") in the Tasks tab to start tracking centre attendance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-sm text-slate-500">Attendance Task</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {attendanceTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-slate-500">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-40"
              />
            </div>
            <div className="flex-1" />
            <Button
              onClick={sendReminders}
              disabled={sendingReminders || absent.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingReminders ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Remind {absent.length} Absent</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{assignedFreelancers.length}</p>
                <p className="text-indigo-100 text-sm">Total Assigned</p>
              </div>
              <Users className="w-12 h-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{present.length}</p>
                <p className="text-green-100 text-sm">Checked In</p>
              </div>
              <CheckCircle className="w-12 h-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{absent.length}</p>
                <p className="text-red-100 text-sm">Not Checked In</p>
              </div>
              <XCircle className="w-12 h-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{attendanceRate}%</p>
                <p className="text-amber-100 text-sm">Attendance Rate</p>
              </div>
              <Calendar className="w-12 h-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Attendance for {format(new Date(selectedDate), 'MMM d, yyyy')}
            </h3>
            <Badge className="bg-slate-100 text-slate-600">
              {present.length}/{assignedFreelancers.length} present
            </Badge>
          </div>
          {assignedFreelancers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>No freelancers assigned to this project yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Freelancer</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Contact</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Selfie</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedFreelancers.map(f => {
                    const response = getResponse(f.email);
                    const isPresent = !!response;
                    return (
                      <tr key={f.email} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {isPresent ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> Present
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" /> Absent
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                        <td className="px-4 py-3 text-slate-600 text-sm">{f.phone || f.email}</td>
                        <td className="px-4 py-3">
                          {response?.response_value ? (
                            <a href={response.response_value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
                              <ImageIcon className="w-4 h-4" /> View
                            </a>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {response?.submission_date
                            ? format(new Date(response.submission_date), 'MMM d, yyyy h:mm a')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
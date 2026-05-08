import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, MapPin, Hash, Type, CheckCircle, Clock, AlertCircle, Upload, Download } from "lucide-react";
import { downloadFile } from "./downloadFile";
import { format } from "date-fns";
import FreelancerTaskSubmit from "./FreelancerTaskSubmit";

const taskTypeIcons = {
  file_upload: FileText,
  image_upload: ImageIcon,
  geo_location: MapPin,
  number_entry: Hash,
  text_entry: Type
};

export default function FreelancerTasksView({ projectId, userEmail, userName }) {
  const [selectedTask, setSelectedTask] = useState(null);

  // Fetch all tasks for the project - we'll filter client-side to handle group/unassigned tasks
  const { data: allTasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId && !!userEmail
  });

  // Fetch groups to know which groups the user belongs to
  const { data: groups = [] } = useQuery({
    queryKey: ['projectGroups', projectId],
    queryFn: () => base44.entities.ProjectGroup.filter({ project_id: projectId }),
    enabled: !!projectId && !!userEmail
  });

  const userGroupIds = groups
    .filter(g => g.members?.includes(userEmail))
    .map(g => g.id);

  // Show tasks that are: assigned directly to user, assigned to user's group, or unassigned (for all)
  const tasks = allTasks.filter(t =>
    t.assigned_to === userEmail ||
    (t.group_id && userGroupIds.includes(t.group_id)) ||
    (!t.assigned_to && !t.group_id)
  );

  const { data: responses = [] } = useQuery({
    queryKey: ['myTaskResponses', projectId, userEmail],
    queryFn: () => base44.entities.TaskResponse.filter({ project_id: projectId, freelancer_email: userEmail }),
    enabled: !!projectId && !!userEmail,
    staleTime: 0
  });

  const getResponse = (taskId) => responses.find(r => r.task_id === taskId);

  const getStatusInfo = (response) => {
    if (!response) return { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock };
    if (response.status === 'approved') return { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (response.status === 'resubmit_required') return { label: 'Resubmit Required', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    return { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Clock };
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p>No tasks assigned to you yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.map((task) => {
          const response = getResponse(task.id);
          const statusInfo = getStatusInfo(response);
          const Icon = taskTypeIcons[task.task_type] || FileText;
          const StatusIcon = statusInfo.icon;

          return (
            <Card key={task.id} className="border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-slate-800">{task.title}</h4>
                        {task.is_required && <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-slate-500">
                            Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      {/* Show submitted images/files with download button */}
                      {response && (response.response_type === 'image' || response.response_type === 'file') && response.response_value && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(() => {
                            let files = [];
                            try {
                              const parsed = JSON.parse(response.response_value);
                              files = Array.isArray(parsed) ? parsed.map(u => ({ url: u, name: u.split('/').pop() })) : [{ url: response.response_value, name: 'file' }];
                            } catch {
                              files = [{ url: response.response_value, name: 'file' }];
                            }
                            return files.map((file, idx) => (
                              <button
                               key={idx}
                               onClick={() => downloadFile(file.url, file.name)}
                               className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg px-2 py-1.5 border border-indigo-200"
                               title="Download"
                              >
                                {response.response_type === 'image' ? (
                                  <img src={file.url} alt="" className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                <Download className="w-3 h-3" />
                                {response.response_type === 'image' ? `Image ${idx + 1}` : file.name.slice(0, 20)}
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                      {response?.admin_notes && (
                        <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">
                          <strong>Admin note:</strong> {response.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setSelectedTask(task)}
                    className={response?.status === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700'}
                  >
                    {!response && <><Upload className="w-3 h-3 mr-1" />Submit</>}
                    {response?.status === 'approved' && <><Upload className="w-3 h-3 mr-1" />Add More</>}
                    {response?.status === 'submitted' && 'Resubmit'}
                    {response?.status === 'resubmit_required' && 'Resubmit'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTask && (
        <FreelancerTaskSubmit
          task={selectedTask}
          existingResponse={getResponse(selectedTask.id)}
          userEmail={userEmail}
          userName={userName}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
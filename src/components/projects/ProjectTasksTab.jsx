import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FileText, Image, MapPin, Hash, AlertCircle, CheckCircle, Clock, GitBranch, ArrowRight, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function ProjectTasksTab({ projectId, project }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showSubTaskDialog, setShowSubTaskDialog] = useState(false);
  const [parentTask, setParentTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'text_entry',
    due_date: '',
    is_required: true,
    assigned_to: '',
    group_id: '',
    depends_on_task_id: '',
    priority: 'medium',
    progress_percentage: 0
  });

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: taskTemplates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => base44.entities.TaskTemplate.filter({ is_active: true }),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['acceptedApplications', projectId],
    queryFn: () => base44.entities.ProjectApplication.filter({ 
      project_id: projectId, 
      status: 'accepted' 
    }),
    enabled: !!projectId
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['projectGroups', projectId],
    queryFn: () => base44.entities.ProjectGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.ProjectTask.create({
        ...data,
        project_id: projectId,
        project_name: project.name,
        status: 'pending'
      });

      // Send notification if task is assigned to individual
      if (data.assigned_to) {
        await base44.entities.Notification.create({
          recipient_email: data.assigned_to,
          title: 'New Task Assigned',
          message: `You have been assigned task: ${data.title} in project ${project.name}`,
          type: 'info',
          link: `/ProjectDetails?id=${projectId}`
        });
      }
      // Send notification to all group members if assigned to group
      if (data.group_id) {
        const grp = groups.find(g => g.id === data.group_id);
        if (grp?.members?.length) {
          await Promise.all(grp.members.map(email =>
            base44.entities.Notification.create({
              recipient_email: email,
              title: 'New Group Task Assigned',
              message: `Your group "${grp.group_name}" has been assigned task: ${data.title} in project ${project.name}`,
              type: 'info',
              link: `/ProjectDetails?id=${projectId}`
            })
          ));
        }
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projectTasks']);
      setShowDialog(false);
      setShowSubTaskDialog(false);
      resetForm();
      toast.success('Task created and notification sent');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectTasks']);
      setShowDialog(false);
      setEditingTask(null);
      resetForm();
      toast.success('Task updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectTasks']);
      toast.success('Task deleted');
    }
  });

  // Auto-send deadline notifications
  useEffect(() => {
    const checkDeadlines = async () => {
      const today = new Date();
      for (const task of tasks) {
        if (task.due_date && task.assigned_to && task.status !== 'completed') {
          const dueDate = new Date(task.due_date);
          const daysUntilDue = differenceInDays(dueDate, today);
          
          // Send notification 3 days before deadline
          if (daysUntilDue === 3) {
            await base44.entities.Notification.create({
              recipient_email: task.assigned_to,
              title: 'Task Deadline Approaching',
              message: `Task "${task.title}" is due in 3 days`,
              type: 'alert',
              link: `/ProjectDetails?id=${projectId}`
            });
          }
        }
      }
    };

    if (tasks.length > 0) {
      checkDeadlines();
    }
  }, [tasks, projectId]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'text_entry',
      due_date: '',
      is_required: true,
      assigned_to: '',
      group_id: '',
      depends_on_task_id: '',
      priority: 'medium',
      progress_percentage: 0
    });
    setEditingTask(null);
    setParentTask(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      task_type: task.task_type,
      due_date: task.due_date || '',
      is_required: task.is_required ?? true,
      assigned_to: task.assigned_to || '',
      group_id: task.group_id || '',
      depends_on_task_id: task.depends_on_task_id || '',
      priority: task.priority || 'medium',
      progress_percentage: task.progress_percentage || 0
    });
    setShowDialog(true);
  };

  const openSubTaskDialog = (task) => {
    resetForm();
    setParentTask(task);
    setShowSubTaskDialog(true);
  };

  const handleSubmit = () => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      const taskData = parentTask 
        ? { ...formData, parent_task_id: parentTask.id }
        : formData;
      createMutation.mutate(taskData);
    }
  };

  const handleImportTemplate = async (template) => {
    const projectStartDate = project?.start_date ? new Date(project.start_date) : new Date();
    let successCount = 0;
    for (const task of template.tasks) {
      const dueDate = task.due_days_offset > 0
        ? format(addDays(projectStartDate, task.due_days_offset), 'yyyy-MM-dd')
        : project?.start_date || '';
      await createMutation.mutateAsync({
        title: task.title,
        description: task.description || '',
        task_type: task.task_type,
        priority: task.priority || 'medium',
        is_required: task.is_required ?? true,
        due_date: dueDate,
        assigned_to: '',
        group_id: '',
        depends_on_task_id: '',
        progress_percentage: 0,
        project_id: projectId,
        project_name: project.name,
        status: 'pending'
      });
      successCount++;
    }
    setShowTemplateDialog(false);
    toast.success(`Imported ${successCount} tasks from "${template.template_name}"`);
  };

  const taskIcons = {
    file_upload: FileText,
    image_upload: Image,
    geo_location: MapPin,
    number_entry: Hash,
    text_entry: FileText
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      blocked: 'bg-red-100 text-red-700',
      archived: 'bg-slate-100 text-slate-700'
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority] || colors.medium;
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Separate main tasks and sub-tasks
  const mainTasks = tasks.filter(t => !t.parent_task_id);
  const getSubTasks = (taskId) => tasks.filter(t => t.parent_task_id === taskId);
  const getDependentTask = (taskId) => tasks.find(t => t.id === taskId);

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Project Tasks</h3>
              <p className="text-sm text-slate-500">{mainTasks.length} main tasks, {tasks.length - mainTasks.length} sub-tasks</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTemplateDialog(true)} size="sm" variant="outline" className="border-purple-400 text-purple-700 hover:bg-purple-50">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Import Template
              </Button>
              <Button onClick={openAddDialog} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {mainTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No tasks created yet
              </div>
            ) : (
              mainTasks.map((task) => {
                const Icon = taskIcons[task.task_type];
                const subTasks = getSubTasks(task.id);
                const dependsOnTask = task.depends_on_task_id ? getDependentTask(task.depends_on_task_id) : null;
                const overdueTask = isOverdue(task.due_date);

                return (
                  <div key={task.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    {/* Main Task */}
                    <div className={`p-4 ${overdueTask && task.status !== 'completed' ? 'bg-red-50' : 'bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          task.status === 'completed' ? 'bg-green-100' : 
                          task.status === 'in_progress' ? 'bg-blue-100' : 
                          'bg-indigo-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            task.status === 'completed' ? 'text-green-600' : 
                            task.status === 'in_progress' ? 'text-blue-600' : 
                            'text-indigo-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{task.title}</h4>
                                {overdueTask && task.status !== 'completed' && (
                                  <Badge className="bg-red-500 text-white">Overdue</Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status?.replace('_', ' ')}
                                </Badge>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                <Badge variant="outline">{task.task_type.replace('_', ' ')}</Badge>
                                {task.is_required && <Badge className="bg-red-100 text-red-700">Required</Badge>}
                                {task.due_date && (
                                  <Badge variant="outline" className={overdueTask ? 'border-red-500 text-red-700' : ''}>
                                    Due: {format(new Date(task.due_date), 'MMM d')}
                                  </Badge>
                                )}
                                {task.assigned_to && (
                                  <Badge variant="outline">
                                    Assigned: {task.assigned_to_name || task.assigned_to}
                                  </Badge>
                                )}
                                {task.group_id && (() => {
                                  const grp = groups.find(g => g.id === task.group_id);
                                  return grp ? (
                                    <Badge className="bg-purple-100 text-purple-700">
                                      Group: {grp.group_name}
                                    </Badge>
                                  ) : null;
                                })()}
                              </div>

                              {/* Dependencies */}
                              {dependsOnTask && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                  <ArrowRight className="w-4 h-4" />
                                  <span>Depends on: <strong>{dependsOnTask.title}</strong></span>
                                </div>
                              )}

                              {/* Progress Bar */}
                              {task.progress_percentage > 0 && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Progress</span>
                                    <span className="font-medium">{task.progress_percentage}%</span>
                                  </div>
                                  <Progress value={task.progress_percentage} className="h-2" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSubTaskDialog(task)}
                                title="Add Sub-task"
                              >
                                <GitBranch className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(task.id)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-tasks */}
                    {subTasks.length > 0 && (
                      <div className="bg-slate-50 border-t border-slate-200">
                        <div className="px-4 py-2 text-sm font-medium text-slate-600">
                          Sub-tasks ({subTasks.length})
                        </div>
                        <div className="px-4 pb-4 space-y-2">
                          {subTasks.map((subTask) => {
                            const SubIcon = taskIcons[subTask.task_type];
                            return (
                              <div key={subTask.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                <SubIcon className="w-4 h-4 text-slate-400" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{subTask.title}</span>
                                    <Badge className={`text-xs ${getStatusColor(subTask.status)}`}>
                                      {subTask.status}
                                    </Badge>
                                  </div>
                                  {subTask.description && (
                                    <p className="text-xs text-slate-500 mt-1">{subTask.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(subTask)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(subTask.id)}
                                    className="text-red-500"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showDialog || showSubTaskDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDialog(false);
          setShowSubTaskDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : parentTask ? `Add Sub-task to "${parentTask.title}"` : 'Add Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Upload attendance photo"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task instructions..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Type *</Label>
                <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text_entry">Text Entry</SelectItem>
                    <SelectItem value="number_entry">Number Entry</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                    <SelectItem value="image_upload">Image Upload</SelectItem>
                    <SelectItem value="geo_location">Geo Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To (Freelancer)</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => {
                  const app = applications.find(a => a.freelancer_email === v);
                  setFormData({ 
                    ...formData, 
                    assigned_to: v === '__none__' ? '' : v,
                    assigned_to_name: app?.freelancer_name || '',
                    group_id: v !== '__none__' ? '' : formData.group_id // clear group if individual selected
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select freelancer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {applications.map((app) => (
                      <SelectItem key={app.id} value={app.freelancer_email}>
                        {app.freelancer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign to Group</Label>
                <Select value={formData.group_id} onValueChange={(v) => {
                  setFormData({ 
                    ...formData, 
                    group_id: v === '__none__' ? '' : v,
                    assigned_to: v !== '__none__' ? '' : formData.assigned_to, // clear individual if group selected
                    assigned_to_name: v !== '__none__' ? '' : formData.assigned_to_name
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No group</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.group_name} ({g.members?.length || 0} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            {!parentTask && (
              <div className="space-y-2">
                <Label>Depends On Task</Label>
                <Select value={formData.depends_on_task_id} onValueChange={(v) => setFormData({ ...formData, depends_on_task_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="No dependency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No dependency</SelectItem>
                    {mainTasks.filter(t => !editingTask || t.id !== editingTask.id).map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingTask && (
              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress_percentage}
                  onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="required">This task is required</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              setShowSubTaskDialog(false);
              resetForm();
            }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
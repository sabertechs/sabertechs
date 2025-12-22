import React, { useState } from "react";
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
import { Plus, Edit, Trash2, FileText, Image, MapPin, Hash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProjectTasksTab({ projectId, project }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'text_entry',
    due_date: '',
    is_required: true
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTask.create({
      ...data,
      project_id: projectId,
      project_name: project.name,
      status: 'active'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectTasks']);
      setShowDialog(false);
      resetForm();
      toast.success('Task created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectTasks']);
      toast.success('Task deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'text_entry',
      due_date: '',
      is_required: true
    });
    setEditingTask(null);
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const taskIcons = {
    file_upload: FileText,
    image_upload: Image,
    geo_location: MapPin,
    number_entry: Hash,
    text_entry: FileText
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Project Tasks</h3>
            <Button onClick={openAddDialog} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No tasks created yet
              </div>
            ) : (
              tasks.map((task) => {
                const Icon = taskIcons[task.task_type];
                return (
                  <div key={task.id} className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{task.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{task.task_type.replace('_', ' ')}</Badge>
                            {task.is_required && <Badge className="bg-red-100 text-red-700">Required</Badge>}
                            {task.due_date && (
                              <Badge variant="outline">Due: {format(new Date(task.due_date), 'MMM d')}</Badge>
                            )}
                          </div>
                        </div>
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
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
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
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} className="bg-indigo-600 hover:bg-indigo-700">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
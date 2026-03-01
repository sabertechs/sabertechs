import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, FileText, Image, MapPin, Hash, Type, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";

const TASK_TYPE_ICONS = {
  file_upload: FileText,
  image_upload: Image,
  geo_location: MapPin,
  number_entry: Hash,
  text_entry: Type
};

const PRIORITY_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

const emptyTask = {
  title: "",
  description: "",
  task_type: "text_entry",
  priority: "medium",
  is_required: true,
  due_days_offset: 0
};

export default function TaskTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [expandedTemplates, setExpandedTemplates] = useState({});
  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    project_type: "",
    tasks: [{ ...emptyTask }],
    is_active: true
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["taskTemplates"],
    queryFn: () => base44.entities.TaskTemplate.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["taskTemplates"]);
      setShowDialog(false);
      resetForm();
      toast.success("Template created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaskTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["taskTemplates"]);
      setShowDialog(false);
      resetForm();
      toast.success("Template updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["taskTemplates"]);
      toast.success("Template deleted");
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: (template) => base44.entities.TaskTemplate.create({
      ...template,
      id: undefined,
      template_name: `${template.template_name} (Copy)`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["taskTemplates"]);
      toast.success("Template duplicated");
    }
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      description: "",
      project_type: "",
      tasks: [{ ...emptyTask }],
      is_active: true
    });
    setEditingTemplate(null);
  };

  const openAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || "",
      project_type: template.project_type || "",
      tasks: template.tasks?.length ? template.tasks : [{ ...emptyTask }],
      is_active: template.is_active ?? true
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.template_name.trim()) return toast.error("Template name is required");
    if (!formData.tasks.length || !formData.tasks[0].title.trim()) return toast.error("At least one task is required");

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTask = () => setFormData(f => ({ ...f, tasks: [...f.tasks, { ...emptyTask }] }));

  const removeTask = (i) => setFormData(f => ({ ...f, tasks: f.tasks.filter((_, idx) => idx !== i) }));

  const updateTask = (i, field, value) => setFormData(f => ({
    ...f,
    tasks: f.tasks.map((t, idx) => idx === i ? { ...t, [field]: value } : t)
  }));

  const toggleExpand = (id) => setExpandedTemplates(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Task Templates</h2>
          <p className="text-slate-500 text-sm mt-1">Create reusable task sets to quickly populate projects</p>
        </div>
        <Button onClick={openAdd} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-slate-400">
              No templates yet. Create one to speed up project setup.
            </CardContent>
          </Card>
        ) : templates.map((t) => {
          const isExpanded = expandedTemplates[t.id];
          return (
            <Card key={t.id} className="border border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {t.template_name}
                      {!t.is_active && <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {t.project_type && <Badge variant="outline">{t.project_type}</Badge>}
                      <span className="text-sm text-slate-500">{t.tasks?.length || 0} tasks</span>
                    </div>
                    {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(t)} title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                      if (confirm("Delete this template?")) deleteMutation.mutate(t.id);
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(t.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {t.tasks?.map((task, i) => {
                      const Icon = TASK_TYPE_ICONS[task.task_type] || FileText;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-400 w-5 mt-0.5">{i + 1}.</span>
                          <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{task.title}</span>
                              <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                              <Badge variant="outline" className="text-xs">{task.task_type?.replace("_", " ")}</Badge>
                              {task.is_required && <Badge className="text-xs bg-red-100 text-red-700">Required</Badge>}
                              {task.due_days_offset > 0 && (
                                <span className="text-xs text-slate-400">Due: Day +{task.due_days_offset}</span>
                              )}
                            </div>
                            {task.description && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit" : "New"} Task Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData(f => ({ ...f, template_name: e.target.value }))}
                  placeholder="e.g., Mock Day Standard Tasks"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Type</Label>
                <Input
                  value={formData.project_type}
                  onChange={(e) => setFormData(f => ({ ...f, project_type: e.target.value }))}
                  placeholder="e.g., Mock Day, Survey, Audit"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="When to use this template..."
                rows={2}
              />
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Tasks ({formData.tasks.length})</Label>
                <Button type="button" size="sm" variant="outline" onClick={addTask}>
                  <Plus className="w-3 h-3 mr-1" /> Add Task
                </Button>
              </div>

              {formData.tasks.map((task, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
                    Task {i + 1}
                    {formData.tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(i)}
                        className="ml-auto text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(i, "title", e.target.value)}
                      placeholder="Task title *"
                    />
                  </div>

                  <Textarea
                    value={task.description}
                    onChange={(e) => updateTask(i, "description", e.target.value)}
                    placeholder="Instructions..."
                    rows={2}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={task.task_type} onValueChange={(v) => updateTask(i, "task_type", v)}>
                        <SelectTrigger className="h-8 text-xs">
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

                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <Select value={task.priority} onValueChange={(v) => updateTask(i, "priority", v)}>
                        <SelectTrigger className="h-8 text-xs">
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

                    <div className="space-y-1">
                      <Label className="text-xs">Due (Day +)</Label>
                      <Input
                        type="number"
                        min="0"
                        className="h-8 text-xs"
                        value={task.due_days_offset}
                        onChange={(e) => updateTask(i, "due_days_offset", parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Required</Label>
                      <div className="flex items-center gap-2 h-8">
                        <input
                          type="checkbox"
                          checked={task.is_required}
                          onChange={(e) => updateTask(i, "is_required", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-slate-600">Yes</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">Template is active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
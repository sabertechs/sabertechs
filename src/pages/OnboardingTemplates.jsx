import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, Edit, CheckCircle2 } from "lucide-react";

const TASK_CATEGORIES = [
  { value: "paperwork", label: "Paperwork" },
  { value: "accounts", label: "Accounts Setup" },
  { value: "training", label: "Training" },
  { value: "equipment", label: "Equipment" },
  { value: "orientation", label: "Orientation" },
  { value: "other", label: "Other" }
];

export default function OnboardingTemplates() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    department: "",
    designation: "",
    tasks: []
  });
  const [currentTask, setCurrentTask] = useState({
    title: "",
    description: "",
    category: "paperwork",
    due_days: 7,
    is_mandatory: true
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => base44.entities.OnboardingTemplate.list('-created_date')
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const settings = await base44.entities.AppSettings.filter({ setting_key: 'departments' });
      return settings[0]?.setting_value || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] })
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      description: "",
      department: "",
      designation: "",
      tasks: []
    });
    setCurrentTask({
      title: "",
      description: "",
      category: "paperwork",
      due_days: 7,
      is_mandatory: true
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      description: template.description || "",
      department: template.department || "",
      designation: template.designation || "",
      tasks: template.tasks
    });
    setShowDialog(true);
  };

  const addTask = () => {
    if (!currentTask.title) return;
    const task = { ...currentTask, task_id: Date.now().toString() };
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
    setCurrentTask({
      title: "",
      description: "",
      category: "paperwork",
      due_days: 7,
      is_mandatory: true
    });
  };

  const removeTask = (taskId) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.task_id !== taskId)
    }));
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, is_active: true });
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      paperwork: "bg-blue-100 text-blue-700",
      accounts: "bg-green-100 text-green-700",
      training: "bg-purple-100 text-purple-700",
      equipment: "bg-orange-100 text-orange-700",
      orientation: "bg-pink-100 text-pink-700",
      other: "bg-slate-100 text-slate-700"
    };
    return colors[category] || colors.other;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Onboarding Templates
          </h1>
          <p className="text-slate-500 mt-1">Create and manage onboarding checklists for new employees</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Onboarding Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  placeholder="e.g., General Employee Onboarding"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What is this template for?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department (Optional)</Label>
                  <Select value={formData.department} onValueChange={(val) => setFormData({...formData, department: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id || dept} value={dept.id || dept}>
                          {dept.name || dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Designation (Optional)</Label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Checklist Tasks</h3>
                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="Task title *"
                    value={currentTask.title}
                    onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
                  />
                  <Textarea
                    placeholder="Task description"
                    value={currentTask.description}
                    onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Select value={currentTask.category} onValueChange={(val) => setCurrentTask({...currentTask, category: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Due in days"
                      value={currentTask.due_days}
                      onChange={(e) => setCurrentTask({...currentTask, due_days: parseInt(e.target.value)})}
                    />
                    <Select value={currentTask.is_mandatory.toString()} onValueChange={(val) => setCurrentTask({...currentTask, is_mandatory: val === "true"})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Mandatory</SelectItem>
                        <SelectItem value="false">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addTask} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                {formData.tasks.length > 0 && (
                  <div className="space-y-2">
                    {formData.tasks.map((task) => (
                      <div key={task.task_id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{task.title}</p>
                            <Badge className={getCategoryColor(task.category)} variant="secondary">
                              {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                            </Badge>
                            {task.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
                          </div>
                          {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
                          <p className="text-xs text-slate-400 mt-1">Due: {task.due_days} days after joining</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTask(task.task_id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.template_name || formData.tasks.length === 0}>
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {template.template_name}
                    {template.department && <Badge variant="outline">{template.department}</Badge>}
                    {template.designation && <Badge variant="outline">{template.designation}</Badge>}
                  </CardTitle>
                  {template.description && (
                    <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(template.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{template.tasks.length} Tasks</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {template.tasks.slice(0, 6).map((task) => (
                    <div key={task.task_id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
                {template.tasks.length > 6 && (
                  <p className="text-xs text-slate-500">+{template.tasks.length - 6} more tasks</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="text-center p-12">
          <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Templates Yet</h3>
          <p className="text-slate-500 mb-4">Create your first onboarding template to get started</p>
        </Card>
      )}
    </div>
  );
}
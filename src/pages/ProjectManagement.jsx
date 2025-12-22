import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProjectManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    application_start_date: '',
    application_end_date: '',
    status: 'draft',
    priority: 'medium',
    payout: '',
    location: '',
    description: '',
    total_slots: ''
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowDialog(false);
      resetForm();
      toast.success('Project created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setShowDialog(false);
      setEditingProject(null);
      resetForm();
      toast.success('Project updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      application_start_date: '',
      application_end_date: '',
      status: 'draft',
      priority: 'medium',
      payout: '',
      location: '',
      description: '',
      total_slots: ''
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingProject(null);
    setShowDialog(true);
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      start_date: project.start_date,
      end_date: project.end_date,
      application_start_date: project.application_start_date,
      application_end_date: project.application_end_date,
      status: project.status,
      priority: project.priority || 'medium',
      payout: project.payout,
      location: project.location,
      description: project.description,
      total_slots: project.total_slots || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (formData.description.split(' ').length < 150) {
      toast.error('Description must be at least 150 words');
      return;
    }

    const data = {
      ...formData,
      payout: parseFloat(formData.payout),
      total_slots: formData.total_slots ? parseInt(formData.total_slots) : undefined
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Project Management</h2>
          <p className="text-slate-500">Create and manage projects for freelancers</p>
        </div>
        <Button onClick={openAddDialog} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(project)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(project.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className={
                  project.status === 'open' ? 'bg-green-100 text-green-700' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  project.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                  'bg-amber-100 text-amber-700'
                }>
                  {project.status}
                </Badge>
                {project.priority === 'high' && (
                  <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-medium">{project.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout:</span>
                <span className="font-medium">₹{project.payout?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-medium">
                  {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d')}
                </span>
              </div>
              {project.total_slots && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Slots:</span>
                  <span className="font-medium">{project.filled_slots || 0}/{project.total_slots}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit' : 'Create'} Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mock Day 4-Sept'25 Delhi NCR"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Application Start Date *</Label>
                <Input
                  type="date"
                  value={formData.application_start_date}
                  onChange={(e) => setFormData({ ...formData, application_start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Application End Date *</Label>
                <Input
                  type="date"
                  value={formData.application_end_date}
                  onChange={(e) => setFormData({ ...formData, application_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Slots</Label>
                <Input
                  type="number"
                  value={formData.total_slots}
                  onChange={(e) => setFormData({ ...formData, total_slots: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payout (₹) *</Label>
                <Input
                  type="number"
                  value={formData.payout}
                  onChange={(e) => setFormData({ ...formData, payout: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Delhi NCR - Gurugram"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (min 150 words) *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed project description..."
                rows={6}
              />
              <p className="text-xs text-slate-500">
                {formData.description.split(' ').filter(w => w).length} / 150 words
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {editingProject ? 'Update' : 'Create'} Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Eye, Trash2, FileText, Search, ChevronLeft, ChevronRight, AlertCircle, CloudUpload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProjectManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    work_mode: 'center_based',
    start_date: '',
    end_date: '',
    application_start_date: '',
    application_start_time: '09:00',
    application_end_date: '',
    application_end_time: '23:59',
    status: 'draft',
    priority: 'medium',
    payout: '',
    location: '',
    description: '',
    total_slots: '',
    supervisor_name: ''
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
      work_mode: 'center_based',
      start_date: '',
      end_date: '',
      application_start_date: '',
      application_start_time: '09:00',
      application_end_date: '',
      application_end_time: '23:59',
      status: 'draft',
      priority: 'medium',
      payout: '',
      location: '',
      description: '',
      total_slots: '',
      supervisor_name: ''
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingProject(null);
    setErrors({});
    setShowDialog(true);
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    
    // Parse date-time fields
    const appStartDate = project.application_start_date ? new Date(project.application_start_date) : null;
    const appEndDate = project.application_end_date ? new Date(project.application_end_date) : null;
    
    setFormData({
      name: project.name,
      work_mode: project.work_mode || 'center_based',
      start_date: project.start_date,
      end_date: project.end_date,
      application_start_date: appStartDate ? appStartDate.toISOString().split('T')[0] : '',
      application_start_time: appStartDate ? appStartDate.toTimeString().slice(0, 5) : '09:00',
      application_end_date: appEndDate ? appEndDate.toISOString().split('T')[0] : '',
      application_end_time: appEndDate ? appEndDate.toTimeString().slice(0, 5) : '23:59',
      status: project.status,
      priority: project.priority || 'medium',
      payout: project.payout,
      location: project.location,
      description: project.description,
      total_slots: project.total_slots || '',
      supervisor_name: project.supervisor_name || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name?.trim()) newErrors.name = 'Project name is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (!formData.application_start_date) newErrors.application_start_date = 'Application start date is required';
    if (!formData.application_end_date) newErrors.application_end_date = 'Application end date is required';
    if (!formData.payout) newErrors.payout = 'Payout is required';
    else if (isNaN(formData.payout) || parseFloat(formData.payout) <= 0) newErrors.payout = 'Payout must be a positive number';
    if (!formData.location?.trim()) newErrors.location = 'Location is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';

    // Date validations
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date cannot be earlier than start date';
    }

    // Combine date and time for application dates
    const appStartDateTime = formData.application_start_date && formData.application_start_time
      ? new Date(`${formData.application_start_date}T${formData.application_start_time}:00`).toISOString()
      : null;
    
    const appEndDateTime = formData.application_end_date && formData.application_end_time
      ? new Date(`${formData.application_end_date}T${formData.application_end_time}:00`).toISOString()
      : null;

    // Application date validations
    if (appStartDateTime && formData.start_date && new Date(appStartDateTime) > new Date(formData.start_date)) {
      newErrors.application_start_date = 'Application start cannot be after project start date';
    }

    if (appEndDateTime && formData.start_date && new Date(appEndDateTime) > new Date(formData.start_date)) {
      newErrors.application_end_date = 'Application end cannot be after project start date';
    }

    if (appStartDateTime && appEndDateTime && new Date(appEndDateTime) <= new Date(appStartDateTime)) {
      newErrors.application_end_date = 'Application end must be after application start';
    }

    // If there are errors, show them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the errors in the form');
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    const data = {
      name: formData.name,
      work_mode: formData.work_mode,
      start_date: formData.start_date,
      end_date: formData.end_date,
      application_start_date: appStartDateTime,
      application_end_date: appEndDateTime,
      status: formData.status,
      priority: formData.priority,
      payout: parseFloat(formData.payout),
      location: formData.location,
      description: formData.description,
      supervisor_name: formData.supervisor_name,
      total_slots: formData.total_slots ? parseInt(formData.total_slots) : undefined
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter and paginate projects
  const filteredProjects = projects.filter(project => 
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.supervisor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-500 text-white',
      completed: 'bg-blue-500 text-white',
      in_progress: 'bg-purple-500 text-white',
      draft: 'bg-gray-400 text-white',
      cancelled: 'bg-red-400 text-white'
    };
    return styles[status] || 'bg-gray-400 text-white';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-700 border border-red-300',
      medium: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      low: 'bg-green-100 text-green-700 border border-green-300'
    };
    return styles[priority] || 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-64"
            />
          </div>
          <Button
            onClick={async () => {
              setExporting(true);
              setExportResult(null);
              const res = await base44.functions.invoke('exportProjectsToDrive');
              setExporting(false);
              if (res.data?.success) {
                setExportResult(res.data);
                toast.success('Exported to Google Drive!');
              } else {
                toast.error(res.data?.error || 'Export failed');
              }
            }}
            disabled={exporting}
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-50"
          >
            <CloudUpload className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export to Drive'}
          </Button>
          {exportResult?.file_url && (
            <a href={exportResult.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <ExternalLink className="w-4 h-4 mr-1" /> View File
              </Button>
            </a>
          )}
          <Button onClick={openAddDialog} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ID</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">NAME</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">WORK MODE</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">STATUS</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">SUPERVISOR</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">PRIORITY</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">PAYOUT</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">CREATED AT</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProjects.map((project, index) => (
                <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm font-medium text-slate-800">
                    #PRJ-{project.id?.slice(-2) || index}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-800 max-w-xs">
                    <div className="font-medium">{project.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={project.work_mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                      {project.work_mode === 'online' ? 'Online' : 'Center Based'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={`${getStatusBadge(project.status)} capitalize`}>
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {project.supervisor_name || 'N/A'}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={`${getPriorityBadge(project.priority)} capitalize`}>
                      {project.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-800">
                    {project.payout ? `₹${project.payout.toLocaleString()}` : 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {format(new Date(project.created_date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                        <Button size="sm" className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`ProjectDetails?id=${project.id}`)}>
                        <Button size="sm" className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        className="h-8 w-8 p-0 bg-slate-900 hover:bg-slate-800"
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this project?')) {
                            deleteMutation.mutate(project.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-slate-900" : ""}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {paginatedProjects.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No projects found
          </div>
        )}
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
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              placeholder="e.g., Mock Day 4-Sept'25 Delhi NCR"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Work Mode *</Label>
            <Select value={formData.work_mode} onValueChange={(v) => setFormData({ ...formData, work_mode: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="center_based">Center Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    setFormData({ ...formData, start_date: e.target.value });
                    if (errors.start_date) setErrors({ ...errors, start_date: null });
                  }}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.start_date}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData({ ...formData, end_date: e.target.value });
                    if (errors.end_date) setErrors({ ...errors, end_date: null });
                  }}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.end_date}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Application Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.application_start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, application_start_date: e.target.value });
                      if (errors.application_start_date) setErrors({ ...errors, application_start_date: null });
                    }}
                    className={errors.application_start_date ? 'border-red-500' : ''}
                  />
                  {errors.application_start_date && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.application_start_date}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Application Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.application_start_time}
                    onChange={(e) => setFormData({ ...formData, application_start_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Application End Date *</Label>
                  <Input
                    type="date"
                    value={formData.application_end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, application_end_date: e.target.value });
                      if (errors.application_end_date) setErrors({ ...errors, application_end_date: null });
                    }}
                    className={errors.application_end_date ? 'border-red-500' : ''}
                  />
                  {errors.application_end_date && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.application_end_date}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Application End Time *</Label>
                  <Input
                    type="time"
                    value={formData.application_end_time}
                    onChange={(e) => setFormData({ ...formData, application_end_time: e.target.value })}
                  />
                </div>
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
                  onChange={(e) => {
                    setFormData({ ...formData, payout: e.target.value });
                    if (errors.payout) setErrors({ ...errors, payout: null });
                  }}
                  placeholder="1000"
                  className={errors.payout ? 'border-red-500' : ''}
                />
                {errors.payout && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.payout}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (errors.location) setErrors({ ...errors, location: null });
                  }}
                  placeholder="Delhi NCR - Gurugram"
                  className={errors.location ? 'border-red-500' : ''}
                />
                {errors.location && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.location}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Supervisor Name</Label>
              <Input
                value={formData.supervisor_name}
                onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                placeholder="e.g., Jaskaran Singh"
              />
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: null });
                }}
                placeholder="Detailed project description..."
                rows={6}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.description}
                </p>
              )}
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
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, Search, UserPlus, CheckCircle, Clock, AlertCircle,
  ChevronRight, FileText, Monitor, GraduationCap, Package,
  Users, ShieldCheck, MoreVertical, Trash2, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEFAULT_TASKS = [
  { task_title: "Submit ID Proof", category: "documents", assigned_to: "employee", priority: "high" },
  { task_title: "Submit Address Proof", category: "documents", assigned_to: "employee", priority: "high" },
  { task_title: "Submit Education Certificates", category: "documents", assigned_to: "employee", priority: "medium" },
  { task_title: "Complete Background Verification", category: "compliance", assigned_to: "hr", priority: "high" },
  { task_title: "Setup Email Account", category: "system_access", assigned_to: "it", priority: "high" },
  { task_title: "Setup Workstation", category: "equipment", assigned_to: "it", priority: "medium" },
  { task_title: "Provide System Access", category: "system_access", assigned_to: "it", priority: "high" },
  { task_title: "Complete Orientation Session", category: "orientation", assigned_to: "hr", priority: "medium" },
  { task_title: "Review Company Policies", category: "compliance", assigned_to: "employee", priority: "medium" },
  { task_title: "Complete Mandatory Training", category: "training", assigned_to: "employee", priority: "medium" },
];

export default function OnboardingManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInitiateDialog, setShowInitiateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const { data: onboardings = [] } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.Onboarding.list('-created_date'),
  });

  const { data: onboardingTasks = [] } = useQuery({
    queryKey: ['onboardingTasks'],
    queryFn: () => base44.entities.OnboardingTask.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: offerLetters = [] } = useQuery({
    queryKey: ['offerLetters'],
    queryFn: () => base44.entities.OfferLetter.filter({ status: 'accepted' }),
  });

  // Get employees with accepted offers who don't have onboarding started
  const eligibleEmployees = employees.filter(emp => {
    const hasAcceptedOffer = offerLetters.some(ol => ol.employee_email === emp.email);
    const hasOnboarding = onboardings.some(ob => ob.employee_email === emp.email);
    return (hasAcceptedOffer || emp.status === 'pending') && !hasOnboarding;
  });

  const createOnboardingMutation = useMutation({
    mutationFn: async (employeeEmail) => {
      const emp = employees.find(e => e.email === employeeEmail);
      if (!emp) return;

      // Create onboarding record
      const onboarding = await base44.entities.Onboarding.create({
        employee_email: emp.email,
        employee_name: emp.full_name,
        department: emp.department,
        designation: emp.designation,
        joining_date: emp.date_of_joining,
        status: "in_progress",
        bg_verification_status: emp.bg_verification_status || "pending"
      });

      // Create default tasks
      const joiningDate = emp.date_of_joining ? new Date(emp.date_of_joining) : new Date();
      for (const task of DEFAULT_TASKS) {
        await base44.entities.OnboardingTask.create({
          employee_email: emp.email,
          employee_name: emp.full_name,
          ...task,
          due_date: format(joiningDate, 'yyyy-MM-dd'),
          status: "pending"
        });
      }

      // Create notification for employee
      await base44.entities.Notification.create({
        recipient_email: emp.email,
        title: "Onboarding Started",
        message: "Your onboarding process has been initiated. Please complete the required tasks.",
        type: "info"
      });

      return onboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardings']);
      queryClient.invalidateQueries(['onboardingTasks']);
      setShowInitiateDialog(false);
      setSelectedEmployee("");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingTask.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['onboardingTasks'])
  });

  const deleteOnboardingMutation = useMutation({
    mutationFn: async (onboarding) => {
      // Delete all tasks
      const tasks = onboardingTasks.filter(t => t.employee_email === onboarding.employee_email);
      for (const task of tasks) {
        await base44.entities.OnboardingTask.delete(task.id);
      }
      await base44.entities.Onboarding.delete(onboarding.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardings']);
      queryClient.invalidateQueries(['onboardingTasks']);
    }
  });

  const getTasksForEmployee = (email) => onboardingTasks.filter(t => t.employee_email === email);
  
  const getProgress = (email) => {
    const tasks = getTasksForEmployee(email);
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const filteredOnboardings = onboardings.filter(ob => {
    const matchesSearch = ob.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
                         ob.employee_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ob.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter(o => o.status === 'in_progress').length,
    completed: onboardings.filter(o => o.status === 'completed').length,
    pendingBgv: onboardings.filter(o => o.bg_verification_status === 'pending').length
  };

  const statusColors = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700'
  };

  const bgvColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const categoryIcons = {
    documents: FileText,
    system_access: Monitor,
    training: GraduationCap,
    equipment: Package,
    orientation: Users,
    compliance: ShieldCheck,
    other: CheckCircle
  };

  const handleViewDetails = (onboarding) => {
    setSelectedOnboarding(onboarding);
    setShowDetailsDialog(true);
  };

  const selectedTasks = selectedOnboarding ? getTasksForEmployee(selectedOnboarding.employee_email) : [];
  const hrTasks = selectedTasks.filter(t => t.assigned_to === 'hr' || t.assigned_to === 'it');
  const employeeTasks = selectedTasks.filter(t => t.assigned_to === 'employee');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Onboarding Management</h2>
          <p className="text-slate-500">Manage new hire onboarding process</p>
        </div>
        <Button onClick={() => setShowInitiateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Initiate Onboarding
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.inProgress}</p>
                <p className="text-sm text-slate-500">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pendingBgv}</p>
                <p className="text-sm text-slate-500">Pending BGV</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding List */}
      <div className="grid gap-4">
        {filteredOnboardings.map((onboarding) => {
          const progress = getProgress(onboarding.employee_email);
          const tasks = getTasksForEmployee(onboarding.employee_email);
          const completedTasks = tasks.filter(t => t.status === 'completed').length;
          
          return (
            <Card key={onboarding.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {onboarding.employee_name?.[0] || 'E'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{onboarding.employee_name}</h3>
                      <p className="text-sm text-slate-500">{onboarding.designation} • {onboarding.department}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColors[onboarding.status]}>
                          {onboarding.status?.replace('_', ' ')}
                        </Badge>
                        <Badge className={bgvColors[onboarding.bg_verification_status]}>
                          BGV: {onboarding.bg_verification_status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium">{completedTasks}/{tasks.length} tasks</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(onboarding)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteOnboardingMutation.mutate(onboarding)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredOnboardings.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <UserPlus className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No onboarding records found</p>
              <Button onClick={() => setShowInitiateDialog(true)} className="mt-4" variant="outline">
                Initiate First Onboarding
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Initiate Onboarding Dialog */}
      <Dialog open={showInitiateDialog} onOpenChange={setShowInitiateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Select an employee to start their onboarding process. Default tasks will be created automatically.
            </p>
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEmployees.length === 0 ? (
                    <SelectItem value="none" disabled>No eligible employees</SelectItem>
                  ) : (
                    eligibleEmployees.map(emp => (
                      <SelectItem key={emp.email} value={emp.email}>
                        {emp.full_name} ({emp.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {eligibleEmployees.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                No employees with accepted offer letters or pending status found. 
                Please accept an offer letter first or add an employee with pending status.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiateDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createOnboardingMutation.mutate(selectedEmployee)}
              disabled={!selectedEmployee || selectedEmployee === "none"}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Start Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Onboarding Details - {selectedOnboarding?.employee_name}</DialogTitle>
          </DialogHeader>
          {selectedOnboarding && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                  {selectedOnboarding.employee_name?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedOnboarding.employee_name}</h3>
                  <p className="text-slate-500">{selectedOnboarding.designation} • {selectedOnboarding.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Joining Date</p>
                  <p className="font-medium">
                    {selectedOnboarding.joining_date ? format(new Date(selectedOnboarding.joining_date), 'MMM d, yyyy') : 'Not set'}
                  </p>
                </div>
              </div>

              {/* BGV Status */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-slate-600" />
                    <span className="font-medium">Background Verification</span>
                  </div>
                  <Badge className={bgvColors[selectedOnboarding.bg_verification_status]}>
                    {selectedOnboarding.bg_verification_status}
                  </Badge>
                </div>
                {selectedOnboarding.bg_verification_status === 'pending' && (
                  <p className="text-sm text-amber-600 mt-2">
                    Background verification is pending. <Link to={createPageUrl("BackgroundVerification")} className="underline">View Details</Link>
                  </p>
                )}
              </div>

              {/* HR/IT Checklist */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> HR/IT Checklist
                </h4>
                <div className="space-y-2">
                  {hrTasks.map((task) => {
                    const Icon = categoryIcons[task.category] || CheckCircle;
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateTaskMutation.mutate({
                              id: task.id,
                              data: { 
                                status: task.status === 'completed' ? 'pending' : 'completed',
                                completed_date: task.status === 'completed' ? null : format(new Date(), 'yyyy-MM-dd')
                              }
                            })}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              task.status === 'completed' 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-slate-300 hover:border-green-400'
                            }`}
                          >
                            {task.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                          </button>
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                            {task.task_title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{task.assigned_to}</Badge>
                          <Badge className={
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Checklist */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Employee Checklist
                </h4>
                <div className="space-y-2">
                  {employeeTasks.map((task) => {
                    const Icon = categoryIcons[task.category] || CheckCircle;
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateTaskMutation.mutate({
                              id: task.id,
                              data: { 
                                status: task.status === 'completed' ? 'pending' : 'completed',
                                completed_date: task.status === 'completed' ? null : format(new Date(), 'yyyy-MM-dd')
                              }
                            })}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              task.status === 'completed' 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-slate-300 hover:border-green-400'
                            }`}
                          >
                            {task.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                          </button>
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                            {task.task_title}
                          </span>
                        </div>
                        <Badge className={
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="p-4 bg-indigo-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-indigo-800">Overall Progress</span>
                  <span className="font-bold text-indigo-600">
                    {selectedTasks.filter(t => t.status === 'completed').length}/{selectedTasks.length} completed
                  </span>
                </div>
                <Progress value={getProgress(selectedOnboarding.employee_email)} className="h-3" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
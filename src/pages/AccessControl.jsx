import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, Save, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const AVAILABLE_SECTIONS = [
  // Core Management (HR & Manager only)
  { id: 'employees', name: 'Employees', description: 'Full employee management', category: 'Management' },
  { id: 'freelancers', name: 'Freelancers', description: 'Manage contractual staff', category: 'Management' },
  { id: 'employee_upload', name: 'Employee Upload', description: 'Bulk upload employees', category: 'Management' },
  { id: 'freelancer_upload', name: 'Freelancer Upload', description: 'Bulk upload freelancers', category: 'Management' },
  { id: 'offer_letters', name: 'Offer Letters', description: 'Create and manage offers', category: 'Management' },
  { id: 'bg_verification', name: 'Background Verification', description: 'Employee verification', category: 'Management' },
  { id: 'api_verification', name: 'API Verification', description: 'External API checks', category: 'Management' },
  
  // Operations (Manager & Dept Head)
  { id: 'attendance', name: 'Attendance', description: 'Attendance management', category: 'Operations' },
  { id: 'payslips', name: 'Payslips', description: 'Payslip generation', category: 'Operations' },
  { id: 'expenses', name: 'Expenses', description: 'Expense approvals', category: 'Operations' },
  { id: 'onboarding', name: 'Onboarding', description: 'Employee onboarding', category: 'Operations' },
  { id: 'team_view', name: 'Team View', description: 'View team members', category: 'Operations' },
  { id: 'projects', name: 'Projects', description: 'Project management', category: 'Operations' },
  { id: 'task_templates', name: 'Task Templates', description: 'Manage project task templates', category: 'Operations' },
  { id: 'project_analytics', name: 'Project Analytics', description: 'View project analytics and reports', category: 'Operations' },
  
  // Assets & Resources (HR only)
  { id: 'assets', name: 'Asset Management', description: 'Full asset control', category: 'Resources' },
  { id: 'settings', name: 'Settings', description: 'App configuration', category: 'Resources' },
  { id: 'access_control', name: 'Access Control', description: 'Manage user permissions', category: 'Resources' },
  { id: 'module_management', name: 'Module Management', description: 'Enable/disable app modules', category: 'Resources' },
  
  // Communication (All)
  { id: 'company_feed', name: 'Company Feed', description: 'Posts and updates', category: 'Communication' },
  { id: 'policies', name: 'Policies', description: 'Company policies', category: 'Communication' },
  { id: 'notifications', name: 'Notifications', description: 'Notifications', category: 'Communication' },
  { id: 'games', name: 'Games', description: 'Office games', category: 'Engagement' },
];

const DEFAULT_ACCESS_BY_ROLE = {
  hr: [
    // Full system access
    'employees', 'freelancers', 'employee_upload', 'freelancer_upload', 'offer_letters', 
    'bg_verification', 'api_verification', 'attendance', 'payslips', 
    'expenses', 'assets', 'settings', 'company_feed', 'policies', 
    'notifications', 'games', 'projects', 'onboarding', 'task_templates', 
    'project_analytics', 'access_control', 'module_management'
  ],
  manager: [
    // Team management + operations (NO assets/settings)
    'employees', 'freelancers', 'employee_upload', 'freelancer_upload', 'offer_letters',
    'bg_verification', 'api_verification', 'attendance', 'payslips',
    'expenses', 'team_view', 'company_feed', 'policies', 
    'notifications', 'games', 'projects', 'onboarding', 'task_templates', 
    'project_analytics'
  ],
  department_head: [
    // Department-level only (filtered by department in backend/UI)
    'employees', 'freelancers', 'attendance', 'payslips', 'expenses',
    'team_view', 'company_feed', 'policies', 'notifications', 'games', 
    'projects', 'onboarding', 'task_templates', 'project_analytics'
  ],
  employee: [
    // Self-service only
    'attendance', 'payslips', 'expenses', 'policies', 'company_feed', 'games'
  ],
  freelancer: [
    // Freelancer-specific access
    'projects', 'payslips', 'company_feed'
  ],
};

export default function AccessControl() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAccess, setSelectedAccess] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setShowEditDialog(false);
      setSelectedEmployee(null);
      toast.success('Access permissions updated');
    }
  });

  const handleEditAccess = (employee) => {
    setSelectedEmployee(employee);
    // Load existing access or default based on role
    const existingAccess = employee.section_access || DEFAULT_ACCESS_BY_ROLE[employee.role] || DEFAULT_ACCESS_BY_ROLE.employee;
    setSelectedAccess(existingAccess);
    setShowEditDialog(true);
  };

  const handleSaveAccess = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    
    await updateMutation.mutateAsync({
      id: selectedEmployee.id,
      data: { section_access: selectedAccess }
    });
    
    setSaving(false);
  };

  const handleRoleChange = async (empId, newRole) => {
    await base44.entities.Employee.update(empId, { 
      role: newRole,
      section_access: DEFAULT_ACCESS_BY_ROLE[newRole] || DEFAULT_ACCESS_BY_ROLE.employee
    });
    queryClient.invalidateQueries(['employees']);
    toast.success('Role updated with default permissions');
  };

  const toggleSection = (sectionId) => {
    setSelectedAccess(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const applyDefaultAccess = () => {
    if (selectedEmployee) {
      const defaultAccess = DEFAULT_ACCESS_BY_ROLE[selectedEmployee.role] || DEFAULT_ACCESS_BY_ROLE.employee;
      setSelectedAccess(defaultAccess);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                         emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors = {
    hr: 'bg-blue-100 text-blue-700',
    manager: 'bg-purple-100 text-purple-700',
    department_head: 'bg-amber-100 text-amber-700',
    employee: 'bg-green-100 text-green-700',
    freelancer: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Access Control</h2>
          <p className="text-slate-500">Manage user roles and section permissions</p>
        </div>
      </div>

      {/* Role Explanation */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-slate-800 mb-3">Role vs Designation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-indigo-600 mb-1">Role (System Access)</p>
              <ul className="text-slate-600 space-y-1">
                <li>• <strong>HR:</strong> Full system access</li>
                <li>• <strong>Manager:</strong> Team management (no assets/settings)</li>
                <li>• <strong>Dept Head:</strong> Department-level access only</li>
                <li>• <strong>Employee:</strong> Self-service only</li>
                <li>• <strong>Freelancer:</strong> Project-based limited access</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-purple-600 mb-1">Designation & Department</p>
              <ul className="text-slate-600 space-y-1">
                <li>• <strong>Designation:</strong> Job title for display (e.g., Sr. Developer)</li>
                <li>• <strong>Department:</strong> Team grouping (e.g., Engineering)</li>
                <li>• Used for filtering, not access control</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['hr', 'manager', 'department_head', 'employee', 'freelancer'].map(role => (
          <Card key={role} className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-800">
                {employees.filter(e => e.role === role).length}
              </p>
              <p className="text-sm text-slate-500 capitalize">{role.replace('_', ' ')}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="department_head">Department Head</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Access List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Current Role</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Change Role</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Access Sections</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {emp.profile_photo ? (
                          <img src={emp.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {emp.full_name?.[0] || 'E'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-sm text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={roleColors[emp.role] || roleColors.employee}>
                        {(emp.role || 'employee').replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Select 
                        value={emp.role || 'employee'} 
                        onValueChange={(value) => handleRoleChange(emp.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="department_head">Department Head</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(emp.section_access || DEFAULT_ACCESS_BY_ROLE[emp.role] || []).slice(0, 3).map(section => (
                          <Badge key={section} variant="outline" className="text-xs">
                            {section.replace('_', ' ')}
                          </Badge>
                        ))}
                        {(emp.section_access || DEFAULT_ACCESS_BY_ROLE[emp.role] || []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(emp.section_access || DEFAULT_ACCESS_BY_ROLE[emp.role] || []).length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAccess(emp)}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Edit Access
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Access Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Edit Section Access
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                {selectedEmployee.profile_photo ? (
                  <img src={selectedEmployee.profile_photo} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {selectedEmployee.full_name?.[0] || 'E'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-800">{selectedEmployee.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedEmployee.email}</p>
                </div>
                <Badge className={roleColors[selectedEmployee.role] + ' ml-auto'}>
                  {(selectedEmployee.role || 'employee').replace('_', ' ')}
                </Badge>
              </div>

              {/* Reset to Default Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={applyDefaultAccess}>
                  Reset to Default for Role
                </Button>
              </div>

              {/* Section Access Checkboxes - Grouped by Category */}
              <div className="space-y-4">
                {['Management', 'Operations', 'Resources', 'Communication', 'Engagement'].map(category => {
                  const sectionsInCategory = AVAILABLE_SECTIONS.filter(s => s.category === category);
                  if (sectionsInCategory.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        {category}
                        <Badge variant="outline" className="text-xs">
                          {sectionsInCategory.filter(s => selectedAccess.includes(s.id)).length}/{sectionsInCategory.length}
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sectionsInCategory.map(section => (
                          <div 
                            key={section.id}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedAccess.includes(section.id) 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => toggleSection(section.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={selectedAccess.includes(section.id)}
                                onCheckedChange={() => toggleSection(section.id)}
                              />
                              <div>
                                <p className="font-medium text-slate-800">{section.name}</p>
                                <p className="text-sm text-slate-500">{section.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAccess} 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
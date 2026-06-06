import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, Save, Users, Loader2, RotateCcw, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE, getPermissionModules } from "@/lib/permissions";

const roleColors = {
  hr: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  department_head: 'bg-amber-100 text-amber-700',
  employee: 'bg-green-100 text-green-700',
  freelancer: 'bg-pink-100 text-pink-700',
};

export default function AccessControl() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});

  const permissionModules = useMemo(() => getPermissionModules(), []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-access'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees-access']);
      setShowEditDialog(false);
      toast.success('Permissions saved');
    }
  });

  const handleEditAccess = (employee) => {
    setSelectedEmployee(employee);
    // Compute effective permissions using role defaults + delta from section_access
    const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[employee.role] || [];
    const extras = (employee.section_access || []).filter(p => !p.startsWith('!'));
    const removed = (employee.section_access || []).filter(p => p.startsWith('!')).map(p => p.slice(1));
    const perms = [...new Set([...roleDefaults, ...extras])].filter(p => !removed.includes(p));
    setSelectedPerms(perms);
    // Expand all modules by default in dialog
    const expanded = {};
    Object.keys(permissionModules).forEach(m => expanded[m] = true);
    setExpandedModules(expanded);
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    // Only store permissions that differ from role defaults:
    // - extras: permissions added beyond role defaults
    // - removed: role defaults explicitly removed (stored as negations prefixed with "!")
    const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[selectedEmployee.role] || [];
    const extras = selectedPerms.filter(p => !roleDefaults.includes(p));
    const removed = roleDefaults.filter(p => !selectedPerms.includes(p)).map(p => `!${p}`);
    // If no delta, save empty array so role defaults apply cleanly
    const toSave = [...extras, ...removed];
    await updateMutation.mutateAsync({ id: selectedEmployee.id, data: { section_access: toSave } });
    setSaving(false);
  };

  const handleResetToRoleDefault = () => {
    if (!selectedEmployee) return;
    // Reset to pure role defaults — saving this will clear section_access
    setSelectedPerms(DEFAULT_PERMISSIONS_BY_ROLE[selectedEmployee.role] || []);
    toast.info('Reset to role defaults — click Save to apply');
  };

  const handleClearAll = () => setSelectedPerms([]);
  const handleSelectAll = () => setSelectedPerms(Object.keys(PERMISSIONS));

  const handleRoleChange = async (empId, newRole) => {
    // When role changes, clear section_access so they inherit new role defaults
    await base44.entities.Employee.update(empId, { role: newRole, section_access: [] });
    queryClient.invalidateQueries(['employees-access']);
    toast.success(`Role updated — will use ${newRole} default permissions`);
  };

  const togglePerm = (key) => {
    setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const toggleModule = (moduleName) => {
    const modulePerms = permissionModules[moduleName].map(p => p.key);
    const allSelected = modulePerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !modulePerms.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const handleBulkReset = async (role) => {
    const roleEmps = employees.filter(e => e.role === role);
    if (!roleEmps.length) { toast.error(`No ${role}s found`); return; }
    setSaving(true);
    await Promise.all(roleEmps.map(e => base44.entities.Employee.update(e.id, { section_access: [] })));
    queryClient.invalidateQueries(['employees-access']);
    setSaving(false);
    toast.success(`Cleared custom permissions for ${roleEmps.length} ${role.replace('_', ' ')}(s) — they now use role defaults`);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getEffectivePerms = (emp) => {
    const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[emp.role] || [];
    if (!emp.section_access || emp.section_access.length === 0) return roleDefaults;
    const extras = emp.section_access.filter(p => !p.startsWith('!'));
    const removed = emp.section_access.filter(p => p.startsWith('!')).map(p => p.slice(1));
    return [...new Set([...roleDefaults, ...extras])].filter(p => !removed.includes(p));
  };

  const isCustomized = (emp) => emp.section_access && emp.section_access.length > 0;

  // In the dialog, diff against role defaults
  const roleDefaultPerms = selectedEmployee ? (DEFAULT_PERMISSIONS_BY_ROLE[selectedEmployee.role] || []) : [];
  const addedPerms = selectedPerms.filter(p => !roleDefaultPerms.includes(p));
  const removedPerms = roleDefaultPerms.filter(p => !selectedPerms.includes(p));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Access Control</h2>
          <p className="text-slate-500">Manage roles and granular permissions per employee</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['hr', 'manager', 'department_head', 'employee', 'freelancer'].map(role => (
            <Button key={role} variant="outline" size="sm" disabled={saving} onClick={() => handleBulkReset(role)} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset {role.replace('_', ' ')}s
            </Button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">How permissions work</p>
              <p>Every employee inherits their <strong>role's default permissions</strong>. You can override any individual with a custom permission set. Custom permissions completely replace the role defaults for that person.</p>
              <p className="text-slate-500">Example: An "Employee" who manages freelancers → give them <em>view_freelancers</em> + <em>manage_projects</em> without making them a full Manager.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['hr', 'manager', 'department_head', 'employee', 'freelancer'].map(role => (
          <Card key={role} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-2xl font-bold text-slate-800">{employees.filter(e => e.role === role).length}</p>
              <p className="text-xs text-slate-500 capitalize mt-0.5">{role.replace('_', ' ')}s</p>
              <p className="text-xs text-indigo-500 mt-1">{employees.filter(e => e.role === role && isCustomized(e)).length} customized</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-44">
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

      {/* Employee Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Change Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const perms = getEffectivePerms(emp);
                  const customized = isCustomized(emp);
                  return (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {emp.profile_photo
                            ? <img src={emp.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                            : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">{emp.full_name?.[0] || 'E'}</div>
                          }
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{emp.full_name}</p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className={roleColors[emp.role] || roleColors.employee}>
                            {(emp.role || 'employee').replace('_', ' ')}
                          </Badge>
                          {customized && <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">custom</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select value={emp.role || 'employee'} onValueChange={val => handleRoleChange(emp.id, val)}>
                          <SelectTrigger className="w-40 h-8 text-sm">
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
                          <span className="text-xs text-slate-500">{perms.length} permissions</span>
                          {customized && (
                            <span className="text-xs text-indigo-500">(custom override)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEditAccess(emp)}>
                          <Shield className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Edit Permissions
            </DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-5">
              {/* Employee info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                {selectedEmployee.profile_photo
                  ? <img src={selectedEmployee.profile_photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                  : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">{selectedEmployee.full_name?.[0]}</div>
                }
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{selectedEmployee.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedEmployee.email} · {selectedEmployee.designation}</p>
                </div>
                <Badge className={roleColors[selectedEmployee.role]}>
                  {(selectedEmployee.role || 'employee').replace('_', ' ')}
                </Badge>
              </div>

              {/* Diff summary */}
              {(addedPerms.length > 0 || removedPerms.length > 0) && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {addedPerms.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-700 mb-1">+ Added vs role default</p>
                      {addedPerms.map(p => <p key={p} className="text-green-600 text-xs">{PERMISSIONS[p]?.label || p}</p>)}
                    </div>
                  )}
                  {removedPerms.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-700 mb-1">− Removed vs role default</p>
                      {removedPerms.map(p => <p key={p} className="text-red-600 text-xs">{PERMISSIONS[p]?.label || p}</p>)}
                    </div>
                  )}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleResetToRoleDefault}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset to {selectedEmployee.role} defaults
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>All</Button>
                <Button variant="outline" size="sm" onClick={handleClearAll}>None</Button>
                <span className="ml-auto text-sm text-slate-500 self-center">{selectedPerms.length} selected</span>
              </div>

              {/* Permission modules */}
              <div className="space-y-3">
                {Object.entries(permissionModules).map(([moduleName, modulePerms]) => {
                  const isExpanded = expandedModules[moduleName];
                  const selectedCount = modulePerms.filter(p => selectedPerms.includes(p.key)).length;
                  const allSelected = selectedCount === modulePerms.length;
                  const someSelected = selectedCount > 0 && !allSelected;

                  return (
                    <div key={moduleName} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
                        onClick={() => setExpandedModules(prev => ({ ...prev, [moduleName]: !prev[moduleName] }))}
                      >
                        <Checkbox
                          checked={allSelected}
                          className={someSelected ? 'opacity-50' : ''}
                          onCheckedChange={(e) => { e.stopPropagation(); toggleModule(moduleName); }}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="font-semibold text-slate-700 flex-1">{moduleName}</span>
                        <Badge variant="outline" className="text-xs">{selectedCount}/{modulePerms.length}</Badge>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                          {modulePerms.map(perm => {
                            const isInDefault = roleDefaultPerms.includes(perm.key);
                            const isSelected = selectedPerms.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                                }`}
                                onClick={() => togglePerm(perm.key)}
                              >
                                <Checkbox checked={isSelected} onCheckedChange={() => togglePerm(perm.key)} onClick={e => e.stopPropagation()} className="mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-800">{perm.label}</p>
                                    {!isInDefault && isSelected && (
                                      <span className="text-xs text-green-600 font-medium">+added</span>
                                    )}
                                    {isInDefault && !isSelected && (
                                      <span className="text-xs text-red-500 font-medium">−removed</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">{perm.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
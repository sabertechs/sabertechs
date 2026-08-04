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
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_DESIGNATION, getPermissionModules, getDesignationLevel } from "@/lib/permissions";

const DESIGNATION_OPTIONS = [
  { value: "hr_head", label: "HR Head", level: "hr" },
  { value: "senior_manager", label: "Senior Manager", level: "manager" },
  { value: "proctor", label: "Proctor", level: "freelancer" },
  { value: "employee", label: "Standard Employee", level: "employee" },
];

const levelColors = {
  hr: "bg-blue-100 text-blue-700",
  manager: "bg-purple-100 text-purple-700",
  freelancer: "bg-pink-100 text-pink-700",
  employee: "bg-green-100 text-green-700",
};

const levelLabels = {
  hr: "HR",
  manager: "Manager",
  freelancer: "Freelancer",
  employee: "Employee",
};

export default function AccessControl() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
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

  const getLevel = (emp) => {
    if (emp.role === 'admin') return 'hr';
    return getDesignationLevel(emp.designation);
  };

  const handleEditAccess = (employee) => {
    setSelectedEmployee(employee);
    const level = getLevel(employee);
    const defaults = DEFAULT_PERMISSIONS_BY_DESIGNATION[level] || [];
    const extras = (employee.section_access || []).filter(p => !p.startsWith('!'));
    const removed = (employee.section_access || []).filter(p => p.startsWith('!')).map(p => p.slice(1));
    const perms = [...new Set([...defaults, ...extras])].filter(p => !removed.includes(p));
    setSelectedPerms(perms);
    const expanded = {};
    Object.keys(permissionModules).forEach(m => expanded[m] = true);
    setExpandedModules(expanded);
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    const level = getLevel(selectedEmployee);
    const defaults = DEFAULT_PERMISSIONS_BY_DESIGNATION[level] || [];
    const extras = selectedPerms.filter(p => !defaults.includes(p));
    const removed = defaults.filter(p => !selectedPerms.includes(p)).map(p => `!${p}`);
    const toSave = [...extras, ...removed];
    await updateMutation.mutateAsync({ id: selectedEmployee.id, data: { section_access: toSave } });
    setSaving(false);
  };

  const handleResetToDefault = () => {
    if (!selectedEmployee) return;
    const level = getLevel(selectedEmployee);
    setSelectedPerms(DEFAULT_PERMISSIONS_BY_DESIGNATION[level] || []);
    toast.info('Reset to designation defaults — click Save to apply');
  };

  const handleClearAll = () => setSelectedPerms([]);
  const handleSelectAll = () => setSelectedPerms(Object.keys(PERMISSIONS));

  const handleDesignationChange = async (empId, newDesignation) => {
    const actualDesignation = newDesignation === 'employee' ? '' : newDesignation;
    await base44.entities.Employee.update(empId, { designation: actualDesignation, section_access: [] });
    queryClient.invalidateQueries(['employees-access']);
    toast.success(`Designation updated — permissions reset to defaults`);
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

  const handleBulkReset = async (level) => {
    const levelEmps = employees.filter(e => getLevel(e) === level);
    if (!levelEmps.length) { toast.error(`No ${levelLabels[level]}s found`); return; }
    setSaving(true);
    await Promise.all(levelEmps.map(e => base44.entities.Employee.update(e.id, { section_access: [] })));
    queryClient.invalidateQueries(['employees-access']);
    setSaving(false);
    toast.success(`Cleared custom permissions for ${levelEmps.length} ${levelLabels[level]}(s)`);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === "all" || getLevel(emp) === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getEffectivePerms = (emp) => {
    const level = getLevel(emp);
    const defaults = DEFAULT_PERMISSIONS_BY_DESIGNATION[level] || [];
    if (!emp.section_access || emp.section_access.length === 0) return defaults;
    const extras = emp.section_access.filter(p => !p.startsWith('!'));
    const removed = emp.section_access.filter(p => p.startsWith('!')).map(p => p.slice(1));
    return [...new Set([...defaults, ...extras])].filter(p => !removed.includes(p));
  };

  const isCustomized = (emp) => emp.section_access && emp.section_access.length > 0;

  const selectedLevel = selectedEmployee ? getLevel(selectedEmployee) : 'employee';
  const levelDefaultPerms = DEFAULT_PERMISSIONS_BY_DESIGNATION[selectedLevel] || [];
  const addedPerms = selectedPerms.filter(p => !levelDefaultPerms.includes(p));
  const removedPerms = levelDefaultPerms.filter(p => !selectedPerms.includes(p));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Access Control</h2>
          <p className="text-slate-500">Manage permissions by designation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['hr', 'manager', 'freelancer', 'employee'].map(level => (
            <Button key={level} variant="outline" size="sm" disabled={saving} onClick={() => handleBulkReset(level)} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset {levelLabels[level]}s
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">How permissions work</p>
              <p>Permissions are driven by <strong>designation</strong>. Set an employee's designation to change their base access level, then fine-tune with individual permission overrides.</p>
              <p className="text-slate-500">HR Head = full access · Senior Manager = team management · Proctor = freelancer access · Standard Employee = self-service only</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['hr', 'manager', 'freelancer', 'employee'].map(level => (
          <Card key={level} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-2xl font-bold text-slate-800">{employees.filter(e => getLevel(e) === level).length}</p>
              <p className="text-xs text-slate-500 mt-0.5">{levelLabels[level]}s</p>
              <p className="text-xs text-indigo-500 mt-1">{employees.filter(e => getLevel(e) === level && isCustomized(e)).length} customized</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Designation</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Change Designation</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const perms = getEffectivePerms(emp);
                  const level = getLevel(emp);
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
                          <Badge className={levelColors[level]}>
                            {levelLabels[level]}
                          </Badge>
                          {customized && <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">custom</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select 
                          value={emp.designation || 'employee'} 
                          onValueChange={val => handleDesignationChange(emp.id, val)}
                        >
                          <SelectTrigger className="w-44 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DESIGNATION_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
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
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                {selectedEmployee.profile_photo
                  ? <img src={selectedEmployee.profile_photo} alt="" className="w-11 h-11 rounded-full object-cover" />
                  : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">{selectedEmployee.full_name?.[0]}</div>
                }
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{selectedEmployee.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedEmployee.email} · {selectedEmployee.designation || 'Standard Employee'}</p>
                </div>
                <Badge className={levelColors[selectedLevel]}>
                  {levelLabels[selectedLevel]}
                </Badge>
              </div>

              {(addedPerms.length > 0 || removedPerms.length > 0) && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {addedPerms.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-700 mb-1">+ Added vs default</p>
                      {addedPerms.map(p => <p key={p} className="text-green-600 text-xs">{PERMISSIONS[p]?.label || p}</p>)}
                    </div>
                  )}
                  {removedPerms.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-700 mb-1">− Removed vs default</p>
                      {removedPerms.map(p => <p key={p} className="text-red-600 text-xs">{PERMISSIONS[p]?.label || p}</p>)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset to {levelLabels[selectedLevel]} defaults
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>All</Button>
                <Button variant="outline" size="sm" onClick={handleClearAll}>None</Button>
                <span className="ml-auto text-sm text-slate-500 self-center">{selectedPerms.length} selected</span>
              </div>

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
                            const isInDefault = levelDefaultPerms.includes(perm.key);
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
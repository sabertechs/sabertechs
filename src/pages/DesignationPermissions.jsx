import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Edit3, Check, X, Loader2, Users, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDesignationPermissions } from "@/hooks/useDesignationPermissions";
import PermissionToggleGroups from "@/components/designations/PermissionToggleGroups";
import { PERMISSIONS } from "@/lib/permissions";

export default function DesignationPermissions() {
  const queryClient = useQueryClient();
  const { designations, isLoading } = useDesignationPermissions();
  const [expanded, setExpanded] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [removingDesignation, setRemovingDesignation] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-designation-count'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const countEmployees = (designationName) =>
    employees.filter(e => e.designation?.toLowerCase() === designationName?.toLowerCase()).length;

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DesignationPermission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['designation-permissions']);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DesignationPermission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['designation-permissions']);
      setShowAddDialog(false);
      setNewName("");
      toast.success("Designation added");
    },
    onError: () => toast.error("Failed to add designation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DesignationPermission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['designation-permissions']);
      queryClient.invalidateQueries(['employees']);
      setRemovingDesignation(null);
      toast.success("Designation removed");
    },
  });

  const handleTogglePerm = async (dp, permKey) => {
    const perms = dp.permissions || [];
    const newPerms = perms.includes(permKey)
      ? perms.filter(p => p !== permKey)
      : [...perms, permKey];
    await updateMutation.mutateAsync({ id: dp.id, data: { permissions: newPerms } });
  };

  const handleToggleModule = async (dp, modulePerms) => {
    const perms = dp.permissions || [];
    const allSelected = modulePerms.every(p => perms.includes(p.key));
    const newPerms = allSelected
      ? perms.filter(p => !modulePerms.some(mp => mp.key === p))
      : [...new Set([...perms, ...modulePerms.map(p => p.key)])];
    await updateMutation.mutateAsync({ id: dp.id, data: { permissions: newPerms } });
  };

  const handleSaveName = async () => {
    if (!editName.trim()) { toast.error("Designation name cannot be empty"); return; }
    const exists = designations.some(d => d.designation_name.toLowerCase() === editName.trim().toLowerCase() && d.id !== editingId);
    if (exists) { toast.error("A designation with this name already exists"); return; }
    setSaving(true);
    const oldName = designations.find(d => d.id === editingId)?.designation_name;
    // Update the designation name
    await updateMutation.mutateAsync({ id: editingId, data: { designation_name: editName.trim() } });
    // Update all employees with the old designation to the new name
    const affected = employees.filter(e => e.designation?.toLowerCase() === oldName?.toLowerCase());
    if (affected.length > 0) {
      await Promise.all(affected.map(e => base44.entities.Employee.update(e.id, { designation: editName.trim() })));
      queryClient.invalidateQueries(['employees']);
    }
    setSaving(false);
    setEditingId(null);
    toast.success(`Renamed to "${editName.trim()}" and updated ${affected.length} employee(s)`);
  };

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Designation name is required"); return; }
    const exists = designations.some(d => d.designation_name.toLowerCase() === newName.trim().toLowerCase());
    if (exists) { toast.error("A designation with this name already exists"); return; }
    await createMutation.mutateAsync({
      designation_name: newName.trim(),
      permissions: [],
      is_system: false,
      display_order: designations.length + 1,
    });
  };

  const handleRemove = async () => {
    if (!removingDesignation) return;
    setSaving(true);
    // Reassign affected employees to 'Employee' designation
    const employeeRow = designations.find(d => d.designation_name.toLowerCase() === 'employee');
    const fallbackName = employeeRow?.designation_name || 'Employee';
    const affected = employees.filter(e => e.designation?.toLowerCase() === removingDesignation.designation_name?.toLowerCase());
    if (affected.length > 0) {
      await Promise.all(affected.map(e => base44.entities.Employee.update(e.id, { designation: fallbackName })));
      queryClient.invalidateQueries(['employees']);
    }
    await deleteMutation.mutateAsync(removingDesignation.id);
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Designation Permissions</h2>
          <p className="text-slate-500">Map module access to each designation — permissions apply automatically to all holders</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Designation
        </Button>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">How permissions work</p>
              <p>Each employee's permissions are determined <strong>solely by their designation</strong>. Toggle the module permissions below for each designation, and every employee with that designation instantly gets that access.</p>
              <p className="text-slate-500">Changes save automatically. Rename a designation to update all holders. Removing a designation reassigns affected employees to "Employee".</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {designations.map((dp) => {
          const isExpanded = expanded[dp.id];
          const empCount = countEmployees(dp.designation_name);
          const permCount = (dp.permissions || []).length;
          const isEditing = editingId === dp.id;

          return (
            <Card key={dp.id} className="border-0 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [dp.id]: !prev[dp.id] }))}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                </button>

                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      className="max-w-xs h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-semibold text-slate-800">{dp.designation_name}</span>
                    {dp.is_system && <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">system</Badge>}
                  </div>
                )}

                {!isEditing && (
                  <>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {empCount}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {permCount}/{Object.keys(PERMISSIONS).length} perms
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(dp.id); setEditName(dp.designation_name); }}>
                      <Edit3 className="w-4 h-4 text-slate-500" />
                    </Button>
                    {!dp.is_system && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemovingDesignation(dp)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                  <PermissionToggleGroups
                    selectedPerms={dp.permissions || []}
                    onToggle={(key) => handleTogglePerm(dp, key)}
                    onToggleModule={(moduleName, modulePerms) => handleToggleModule(dp, modulePerms)}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Designation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Add New Designation
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-slate-500">Enter a designation name. You can toggle its permissions after creating it.</p>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="e.g. Team Lead, Operations Executive"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removingDesignation} onOpenChange={(open) => !open && setRemovingDesignation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Designation</DialogTitle>
          </DialogHeader>
          {removingDesignation && (
            <div className="py-4 space-y-3">
              <p className="text-slate-600">
                Are you sure you want to remove <strong>{removingDesignation.designation_name}</strong>?
              </p>
              {countEmployees(removingDesignation.designation_name) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  ⚠️ {countEmployees(removingDesignation.designation_name)} employee(s) have this designation. They will be reassigned to "Employee".
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingDesignation(null)}>Cancel</Button>
            <Button onClick={handleRemove} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
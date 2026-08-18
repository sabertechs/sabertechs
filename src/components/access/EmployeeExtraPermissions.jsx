import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PermissionToggleGroups from "@/components/designations/PermissionToggleGroups";
import { getEffectivePermissions } from "@/lib/permissions";

/**
 * Per-employee extra permissions editor.
 * Shows the employee's designation-derived permissions as locked (already granted),
 * and lets an admin toggle extra permission keys that are persisted to
 * employee.extra_permissions and merged on top of the cascade at runtime.
 *
 * Props:
 *   employee: Employee record
 *   designations: DesignationPermission[] (from useDesignationPermissions)
 */
export default function EmployeeExtraPermissions({ employee, designations }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Designation-derived perms (exclude extra) — shown as locked "already granted"
  const designationOnlyPerms = getEffectivePermissions(
    { ...employee, extra_permissions: [] },
    designations
  );
  const inheritedPerms = designationOnlyPerms.map(key => ({
    key,
    fromDesignation: employee.designation || 'Designation',
  }));

  const extraPerms = Array.isArray(employee.extra_permissions) ? employee.extra_permissions : [];

  const persist = async (newExtra) => {
    setSaving(true);
    try {
      await base44.entities.Employee.update(employee.id, { extra_permissions: newExtra });
      queryClient.invalidateQueries(['employees-access']);
    } catch {
      toast.error("Failed to update extra permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key) => {
    const newExtra = extraPerms.includes(key)
      ? extraPerms.filter(k => k !== key)
      : [...extraPerms, key];
    persist(newExtra);
  };

  const handleToggleModule = (modulePerms) => {
    const allSelected = modulePerms.every(p => extraPerms.includes(p.key));
    const newExtra = allSelected
      ? extraPerms.filter(p => !modulePerms.some(mp => mp.key === p))
      : [...new Set([...extraPerms, ...modulePerms.map(p => p.key)])];
    persist(newExtra);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Extra permissions (individual override)</p>
          <p className="text-xs text-slate-500">Add module access for this person only — on top of their designation.</p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
      </div>
      <PermissionToggleGroups
        selectedPerms={extraPerms}
        onToggle={handleToggle}
        onToggleModule={(_moduleName, modulePerms) => handleToggleModule(modulePerms)}
        inheritedPerms={inheritedPerms}
      />
    </div>
  );
}
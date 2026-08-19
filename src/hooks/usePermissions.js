import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getEffectivePermissions, isFreelancer, getDesignationLevel, resolveCan } from '@/lib/permissions';

/**
 * Hook that returns permission-checking utilities for the current user.
 *
 * Way 1: user.data is the SOLE permission source (designation + employment_type).
 * The Employee entity is never queried for authorization. The platform admin
 * (user.role === 'admin', the app owner) retains a full-access override — the
 * only role-based check that remains. No per-employee overrides.
 *
 * can() accepts new module.action keys (e.g. 'projects.create') and legacy
 * aliased keys (e.g. 'manage_projects') via the resolveCan bridge.
 *
 * Usage:
 *   const { can, permissions, user, isFreelancer: isFreel, isAdmin, designationLevel, loading } = usePermissions();
 *   if (can('payroll.employee.view')) { ... }
 */
export function usePermissions() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null); // business data only — NOT a permission source
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [designationPermissions, setDesignationPermissions] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me?.role === 'admin');
        const [dpRows, employees] = await Promise.all([
          base44.entities.DesignationPermission.list('display_order'),
          base44.entities.Employee.filter({ email: me.email }),
        ]);
        setDesignationPermissions(dpRows);
        if (employees.length > 0) setEmployee(employees[0]);
      } catch (e) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Permissions resolve from user.data (Way 1) — never from the Employee record.
  const permissions = useMemo(
    () => getEffectivePermissions(user, designationPermissions),
    [user, designationPermissions]
  );

  const freelancer = useMemo(() => isFreelancer(user), [user]);
  const designationLevel = useMemo(
    () => getDesignationLevel(user?.data?.designation ?? user?.designation),
    [user]
  );

  const can = useMemo(() => (permission) => {
    if (isAdmin) return true; // platform admin (app owner) override
    return resolveCan(permissions, permission);
  }, [permissions, isAdmin]);

  return { can, permissions, user, employee, isFreelancer: freelancer, isAdmin, designationLevel, loading };
}
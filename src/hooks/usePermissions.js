import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getEffectivePermissions, isFreelancer, getDesignationLevel, resolveCan } from '@/lib/permissions';

/**
 * Hook that returns permission-checking utilities for the current user.
 *
 * Way 1: user.data is the SOLE permission source (designation + employment_type).
 * The Employee entity is never queried for authorization. No per-employee overrides.
 * The platform owner's built-in account flag is used only to identify the app owner;
 * employee/module access is always resolved from User.data.designation.
 *
 * can() accepts module.action keys (e.g. 'projects.create', 'attendance.team.edit').
 * A legacy alias bridge remains for backward compatibility but all call sites
 * now use the new module.action keys directly.
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
        let me = await base44.auth.me();
        // One-time bootstrap only: migrate existing platform-user permission data.
        // After migration, all employee/module authorization uses User.data.designation.
        if (me?.role === 'admin' && !me?.data?.designation) {
          try {
            await base44.functions.invoke('migrateUserPermissionData', {});
            me = await base44.auth.me();
          } catch (migrationError) {
            console.warn('Permission data migration pending:', migrationError?.message);
          }
        }
        setUser(me);
        setIsAdmin(me?.data?.designation?.toLowerCase() === 'admin');
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
    if (isAdmin) return true; // Admin designation has full access
    return resolveCan(permissions, permission);
  }, [permissions, isAdmin]);

  return { can, permissions, user, employee, isFreelancer: freelancer, isAdmin, designationLevel, loading };
}
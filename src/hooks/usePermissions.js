import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getEffectivePermissions, isFreelancer, getDesignationLevel } from '@/lib/permissions';

/**
 * Hook that returns permission-checking utilities for the current user.
 *
 * Designation Access is the sole source of module permissions for employees.
 * The platform admin (user.role === 'admin', the app owner) retains a full-access
 * override so the app can be administered — this is the only role-based check that remains.
 *
 * Usage:
 *   const { can, permissions, employee, isFreelancer: isFreel, isAdmin, designationLevel, loading } = usePermissions();
 *   if (can('view_all_payslips')) { ... }
 */
export function usePermissions() {
  const [employee, setEmployee] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [designationPermissions, setDesignationPermissions] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user?.role === 'admin');
        const [employees, dpRows] = await Promise.all([
          base44.entities.Employee.filter({ email: user.email }),
          base44.entities.DesignationPermission.list('display_order'),
        ]);
        setDesignationPermissions(dpRows);
        if (employees.length > 0) {
          setEmployee(employees[0]);
        }
        // Platform admins with no Employee record get no employee-scoped permissions
        // from Designation Access; the admin override in can() grants full access instead.
      } catch (e) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const permissions = useMemo(
    () => getEffectivePermissions(employee, designationPermissions),
    [employee, designationPermissions]
  );

  const freelancer = useMemo(() => isFreelancer(employee), [employee]);
  const designationLevel = useMemo(() => getDesignationLevel(employee?.designation), [employee?.designation]);

  const can = useMemo(() => (permission) => {
    if (isAdmin) return true; // platform admin (app owner) override
    return permissions.includes(permission);
  }, [permissions, isAdmin]);

  return { can, permissions, employee, isFreelancer: freelancer, isAdmin, designationLevel, loading };
}
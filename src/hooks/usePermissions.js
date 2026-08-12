import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getEffectivePermissions, getDesignationRole } from '@/lib/permissions';

/**
 * Hook that returns permission-checking utilities for the current user.
 *
 * Usage:
 *   const { can, permissions, isAdmin, designationLevel, loading } = usePermissions();
 *   if (can('view_all_payslips')) { ... }
 */
export function usePermissions() {
  const [employee, setEmployee] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [designationPermissions, setDesignationPermissions] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const user = await base44.auth.me();
        setUserRole(user?.role);
        const [employees, dpRows] = await Promise.all([
          base44.entities.Employee.filter({ email: user.email }),
          base44.entities.DesignationPermission.list('display_order'),
        ]);
        setDesignationPermissions(dpRows);
        if (employees.length > 0) {
          setEmployee(employees[0]);
        } else if (user?.role === 'admin') {
          setEmployee({ role: 'admin', designation: 'hr_head' });
        }
      } catch (e) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const permissions = useMemo(() => getEffectivePermissions(employee, designationPermissions), [employee, designationPermissions]);
  const isAdmin = userRole === 'admin';
  const designationLevel = useMemo(() => {
    if (isAdmin) return 'hr';
    return getDesignationRole(employee?.designation);
  }, [employee?.designation, isAdmin]);

  const can = useMemo(() => (permission) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  }, [permissions, isAdmin]);

  return { can, permissions, employee, isAdmin, designationLevel, loading };
}
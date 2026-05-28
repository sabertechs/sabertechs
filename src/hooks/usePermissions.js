import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getEffectivePermissions } from '@/lib/permissions';

/**
 * Hook that returns permission-checking utilities for the current user.
 * 
 * Usage:
 *   const { can, permissions, isAdmin, loading } = usePermissions();
 *   if (can('view_all_payslips')) { ... }
 */
export function usePermissions() {
  const [employee, setEmployee] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const user = await base44.auth.me();
        setUserRole(user?.role);
        const employees = await base44.entities.Employee.filter({ email: user.email });
        if (employees.length > 0) {
          setEmployee(employees[0]);
        } else if (user?.role === 'admin') {
          // Platform admins get full access
          setEmployee({ role: 'hr', section_access: [] });
        }
      } catch (e) {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const permissions = useMemo(() => getEffectivePermissions(employee), [employee]);

  const isAdmin = userRole === 'admin';

  const can = useMemo(() => (permission) => {
    if (isAdmin) return true; // platform admins bypass all checks
    return permissions.includes(permission);
  }, [permissions, isAdmin]);

  return { can, permissions, employee, isAdmin, loading };
}
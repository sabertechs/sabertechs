import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useRef } from 'react';
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_DESIGNATION } from '@/lib/permissions';

let hasSeeded = false;

const SEED_DESIGNATIONS = [
  { designation_name: 'HR Head', permissions: Object.keys(PERMISSIONS), is_system: true, display_order: 1 },
  { designation_name: 'Senior Manager', permissions: DEFAULT_PERMISSIONS_BY_DESIGNATION.manager, is_system: true, display_order: 2 },
  { designation_name: 'Assistant Manager', permissions: ['view_employees', 'view_freelancers', 'manage_freelancers', 'view_payroll_records', 'view_projects', 'view_team', 'manage_attendance', 'approve_expenses'], is_system: true, display_order: 3 },
  { designation_name: 'Proctor', permissions: ['view_projects'], is_system: true, display_order: 4 },
  { designation_name: 'Employee', permissions: DEFAULT_PERMISSIONS_BY_DESIGNATION.employee, is_system: true, display_order: 5 },
];

/**
 * Fetches all DesignationPermission rows (cached) and seeds defaults on first load if empty.
 * Used by Layout, usePermissions, and the DesignationPermissions page.
 */
export function useDesignationPermissions() {
  const queryClient = useQueryClient();
  const { data: designations = [], isLoading } = useQuery({
    queryKey: ['designation-permissions'],
    queryFn: () => base44.entities.DesignationPermission.list('display_order'),
    staleTime: 10 * 60 * 1000,
  });

  const seedingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && designations.length === 0 && !seedingRef.current && !hasSeeded) {
      seedingRef.current = true;
      hasSeeded = true;
      base44.entities.DesignationPermission.bulkCreate(SEED_DESIGNATIONS)
        .then(() => queryClient.invalidateQueries(['designation-permissions']))
        .catch(() => { seedingRef.current = false; hasSeeded = false; });
    }
  }, [isLoading, designations.length, queryClient]);

  return { designations, isLoading };
}
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, Users, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PERMISSIONS, getEffectivePermissions } from "@/lib/permissions";
import { useDesignationPermissions } from "@/hooks/useDesignationPermissions";

export default function AccessControl() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedEmp, setExpandedEmp] = useState(null);
  const { designations } = useDesignationPermissions();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-access'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const handleDesignationChange = async (empId, newDesignation) => {
    try {
      await base44.entities.Employee.update(empId, { designation: newDesignation });
      queryClient.invalidateQueries(['employees-access']);
      toast.success(`Designation updated to "${newDesignation}" — permissions updated automatically`);
    } catch {
      toast.error("Failed to update designation");
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getPerms = (emp) => {
    return getEffectivePermissions(emp, designations);
  };

  const permModules = useMemo(() => {
    const modules = {};
    Object.entries(PERMISSIONS).forEach(([key, val]) => {
      if (!modules[val.module]) modules[val.module] = [];
      modules[val.module].push({ key, ...val });
    });
    return modules;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Access Control</h2>
        <p className="text-slate-500">View employee permissions by designation — manage the mapping in Designation Permissions</p>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-800">How permissions work</p>
              <p>Permissions are driven <strong>solely by designation</strong>. Change an employee's designation to update their access. To edit which permissions each designation gets, go to <strong>Designation Permissions</strong>.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => {
                  const perms = getPerms(emp);
                  const isExpanded = expandedEmp === emp.id;
                  return (
                    <React.Fragment key={emp.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
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
                          <Select
                            value={emp.designation || 'Employee'}
                            onValueChange={val => handleDesignationChange(emp.id, val)}
                          >
                            <SelectTrigger className="w-48 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {designations.map(d => (
                                <SelectItem key={d.id} value={d.designation_name}>{d.designation_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedEmp(isExpanded ? null : emp.id)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>{perms.length} permissions</span>
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={3} className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map(key => (
                                <Badge key={key} variant="outline" className="text-xs bg-white">
                                  {PERMISSIONS[key]?.label || key}
                                </Badge>
                              ))}
                              {perms.length === 0 && <span className="text-sm text-slate-400">No permissions assigned</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
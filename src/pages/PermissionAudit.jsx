import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE, getEffectivePermissions } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Users, ShieldCheck, ShieldAlert, Shield, Info, CheckCircle2, XCircle, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Constants ──────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  admin:           "bg-purple-100 text-purple-800 border-purple-200",
  hr:              "bg-blue-100 text-blue-800 border-blue-200",
  manager:         "bg-green-100 text-green-800 border-green-200",
  department_head: "bg-orange-100 text-orange-800 border-orange-200",
  employee:        "bg-slate-100 text-slate-700 border-slate-200",
  freelancer:      "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const ROLE_LABELS = {
  admin:           "Admin",
  hr:              "HR",
  manager:         "Manager",
  department_head: "Dept Head",
  employee:        "Employee",
  freelancer:      "Freelancer",
};

// Build module list from PERMISSIONS config
const MODULE_LIST = (() => {
  const map = {};
  Object.entries(PERMISSIONS).forEach(([key, val]) => {
    if (!map[val.module]) map[val.module] = { name: val.module, perms: [] };
    map[val.module].perms.push(key);
  });
  return Object.values(map);
})();

const MODULE_COLORS = {
  "HR Admin":       { full: "bg-blue-500",   partial: "bg-blue-200",   none: "bg-slate-100", text: "text-blue-700",   none_text: "text-slate-300" },
  "Freelancers":    { full: "bg-yellow-500",  partial: "bg-yellow-200", none: "bg-slate-100", text: "text-yellow-700", none_text: "text-slate-300" },
  "Payroll":        { full: "bg-green-500",   partial: "bg-green-200",  none: "bg-slate-100", text: "text-green-700",  none_text: "text-slate-300" },
  "Attendance":     { full: "bg-indigo-500",  partial: "bg-indigo-200", none: "bg-slate-100", text: "text-indigo-700", none_text: "text-slate-300" },
  "Expenses":       { full: "bg-red-500",     partial: "bg-red-200",    none: "bg-slate-100", text: "text-red-700",    none_text: "text-slate-300" },
  "Projects":       { full: "bg-purple-500",  partial: "bg-purple-200", none: "bg-slate-100", text: "text-purple-700", none_text: "text-slate-300" },
  "Assets":         { full: "bg-orange-500",  partial: "bg-orange-200", none: "bg-slate-100", text: "text-orange-700", none_text: "text-slate-300" },
  "Recruitment":    { full: "bg-pink-500",    partial: "bg-pink-200",   none: "bg-slate-100", text: "text-pink-700",   none_text: "text-slate-300" },
  "Communication":  { full: "bg-teal-500",    partial: "bg-teal-200",   none: "bg-slate-100", text: "text-teal-700",   none_text: "text-slate-300" },
  "System":         { full: "bg-slate-600",   partial: "bg-slate-300",  none: "bg-slate-100", text: "text-slate-700",  none_text: "text-slate-300" },
};

// ── Module Cell ────────────────────────────────────────────────────────────

function ModuleCell({ module, effectivePerms, onHover }) {
  const total = module.perms.length;
  const active = module.perms.filter(p => effectivePerms.includes(p)).length;
  const colors = MODULE_COLORS[module.name] || MODULE_COLORS["System"];

  if (active === 0) {
    return (
      <td className="px-2 py-3 text-center">
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${colors.none} ${colors.none_text} text-xs font-bold mx-auto`}>
          —
        </div>
      </td>
    );
  }

  const isFull = active === total;
  const bgClass = isFull ? colors.full : colors.partial;
  const textClass = isFull ? "text-white" : colors.text;

  return (
    <td className="px-2 py-3 text-center">
      <div
        className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg ${bgClass} ${textClass} cursor-pointer hover:opacity-80 transition-opacity mx-auto`}
        onMouseEnter={e => onHover({ module, active, total, effectivePerms, anchor: e.currentTarget.getBoundingClientRect() })}
        onMouseLeave={() => onHover(null)}
        title={`${active}/${total} permissions`}
      >
        <span className="text-xs font-bold leading-none">{active}</span>
        <span className="text-[9px] leading-none opacity-75">/{total}</span>
      </div>
    </td>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function PermTooltip({ data }) {
  if (!data) return null;
  const { module, active, total, effectivePerms } = data;

  return (
    <div className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-48 max-w-64 pointer-events-none"
      style={{ top: data.anchor.bottom + 8, left: Math.max(8, data.anchor.left - 80) }}
    >
      <p className="text-xs font-bold text-slate-700 mb-2">{module.name} — {active}/{total}</p>
      <div className="space-y-1">
        {module.perms.map(p => {
          const has = effectivePerms.includes(p);
          return (
            <div key={p} className={`flex items-center gap-1.5 text-xs ${has ? "text-slate-700" : "text-slate-300"}`}>
              {has
                ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                : <XCircle className="w-3 h-3 text-slate-200 flex-shrink-0" />
              }
              {PERMISSIONS[p]?.label || p}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── User Row ───────────────────────────────────────────────────────────────

function AuditRow({ emp, onHover }) {
  const effectivePerms = getEffectivePermissions(emp);
  const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[emp.role] || [];
  const hasCustom = emp.section_access && emp.section_access.length > 0;
  const extraCount = effectivePerms.filter(p => !roleDefaults.includes(p)).length;
  const removedCount = roleDefaults.filter(p => !effectivePerms.includes(p)).length;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      {/* User */}
      <td className="px-4 py-3 sticky left-0 bg-white border-r border-slate-100 z-10 min-w-48">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {emp.full_name?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate max-w-32">{emp.full_name}</p>
            <p className="text-[10px] text-slate-400 truncate max-w-32">{emp.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-3 py-3 min-w-28">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[emp.role] || ROLE_COLORS.employee}`}>
          {ROLE_LABELS[emp.role] || emp.role}
        </span>
      </td>

      {/* Department */}
      <td className="px-3 py-3 min-w-28">
        <span className="text-xs text-slate-500">{emp.department || "—"}</span>
      </td>

      {/* Access type */}
      <td className="px-3 py-3 min-w-32">
        <div className="flex flex-col gap-1">
          {hasCustom ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 w-fit">
              <ShieldAlert className="w-3 h-3" /> Custom
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 w-fit">
              <Shield className="w-3 h-3" /> Default
            </span>
          )}
          <div className="flex gap-1">
            {extraCount > 0 && <span className="text-[10px] text-green-600 font-medium">+{extraCount}</span>}
            {removedCount > 0 && <span className="text-[10px] text-red-500 font-medium">-{removedCount}</span>}
          </div>
        </div>
      </td>

      {/* Module cells */}
      {MODULE_LIST.map(module => (
        <ModuleCell key={module.name} module={module} effectivePerms={effectivePerms} onHover={onHover} />
      ))}

      {/* Total */}
      <td className="px-3 py-3 text-center min-w-20">
        <span className="text-sm font-bold text-slate-700">{effectivePerms.length}</span>
        <span className="text-xs text-slate-400">/{Object.keys(PERMISSIONS).length}</span>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PermissionAudit() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [tooltip, setTooltip] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-audit"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const departments = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
    return depts;
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = !search ||
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      const matchDept = deptFilter === "all" || emp.department === deptFilter;
      return matchSearch && matchRole && matchDept;
    });
  }, [employees, search, roleFilter, deptFilter]);

  // Stats
  const customizedCount = employees.filter(e => e.section_access && e.section_access.length > 0).length;
  const roleBreakdown = employees.reduce((acc, e) => {
    const label = ROLE_LABELS[e.role] || e.role || "Unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Permission Audit</h1>
          <p className="text-slate-500 text-sm mt-1">Full visibility into every user's role and active module permissions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          Hover over any module cell to see individual permissions
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-slate-500 font-medium">Total Users</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{employees.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">Custom Access</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{customizedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500 font-medium">Default Access</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{employees.length - customizedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-500 font-medium">Role Breakdown</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(roleBreakdown).map(([label, count]) => (
                <span key={label} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {label} ({count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="department_head">Dept Head</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="freelancer">Freelancer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-medium">Module cell legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-[9px] font-bold">4/4</div>
          <span>Full access</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-green-200 flex items-center justify-center text-green-700 text-[9px] font-bold">2/4</div>
          <span>Partial access</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-300 text-[9px] font-bold">—</div>
          <span>No access</span>
        </div>
      </div>

      {/* Matrix Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 border-r border-slate-200 z-10 min-w-48">
                  User
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-28">
                  Role
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-28">
                  Dept
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-32">
                  Access
                </th>
                {MODULE_LIST.map(m => (
                  <th key={m.name} className="px-2 py-3 text-center min-w-14">
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full`}
                        style={{ backgroundColor: (MODULE_COLORS[m.name] || MODULE_COLORS["System"]).full.replace('bg-', '').replace('-500', '') }}
                      />
                      <span className="text-[10px] font-semibold text-slate-500 leading-tight max-w-12 text-center">
                        {m.name.replace(' ', '\n')}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-20">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={MODULE_LIST.length + 5} className="px-4 py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={MODULE_LIST.length + 5} className="px-4 py-16 text-center text-slate-400 text-sm">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <AuditRow key={emp.id} emp={emp} onHover={setTooltip} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Showing {filtered.length} of {employees.length} users</span>
            <div className="flex flex-wrap gap-2">
              {MODULE_LIST.map(m => (
                <span key={m.name} className="text-xs text-slate-400">{m.name}: {m.perms.length} perms</span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Tooltip */}
      <PermTooltip data={tooltip} />
    </div>
  );
}
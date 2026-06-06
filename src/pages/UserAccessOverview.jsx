import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PERMISSIONS, DEFAULT_PERMISSIONS_BY_ROLE, getEffectivePermissions } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Users, ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  hr: "bg-blue-100 text-blue-800 border-blue-200",
  manager: "bg-green-100 text-green-800 border-green-200",
  department_head: "bg-orange-100 text-orange-800 border-orange-200",
  employee: "bg-slate-100 text-slate-700 border-slate-200",
  freelancer: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const ROLE_LABELS = {
  admin: "Admin",
  hr: "HR",
  manager: "Manager",
  department_head: "Dept Head",
  employee: "Employee",
  freelancer: "Freelancer",
};

function PermissionDot({ has }) {
  return has
    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
    : <XCircle className="w-3.5 h-3.5 text-slate-200 flex-shrink-0" />;
}

function UserRow({ emp, allPermKeys, expanded, onToggle }) {
  const effectivePerms = getEffectivePermissions(emp);
  const roleDefaults = DEFAULT_PERMISSIONS_BY_ROLE[emp.role] || [];
  const hasCustom = emp.section_access && emp.section_access.length > 0;

  const extraPerms = effectivePerms.filter(p => !roleDefaults.includes(p));
  const removedPerms = roleDefaults.filter(p => !effectivePerms.includes(p));

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {emp.full_name?.[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
              <p className="text-xs text-slate-400">{emp.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[emp.role] || ROLE_COLORS.employee}`}>
            {ROLE_LABELS[emp.role] || emp.role}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-slate-500">{emp.department || "—"}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasCustom ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldAlert className="w-3 h-3" /> Customized
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                <Shield className="w-3 h-3" /> Default
              </span>
            )}
            {extraPerms.length > 0 && (
              <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-normal">
                +{extraPerms.length} extra
              </Badge>
            )}
            {removedPerms.length > 0 && (
              <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs font-normal">
                -{removedPerms.length} removed
              </Badge>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs font-semibold text-slate-600">{effectivePerms.length}</span>
          <span className="text-xs text-slate-400"> / {allPermKeys.length}</span>
        </td>
        <td className="px-4 py-3 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-4">
              {/* Extra / removed callouts */}
              {(extraPerms.length > 0 || removedPerms.length > 0) && (
                <div className="flex flex-wrap gap-4">
                  {extraPerms.length > 0 && (
                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-green-800 mb-1">Extra permissions (beyond role default)</p>
                        <div className="flex flex-wrap gap-1">
                          {extraPerms.map(p => (
                            <span key={p} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {PERMISSIONS[p]?.label || p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {removedPerms.length > 0 && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-red-800 mb-1">Removed permissions (from role default)</p>
                        <div className="flex flex-wrap gap-1">
                          {removedPerms.map(p => (
                            <span key={p} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              {PERMISSIONS[p]?.label || p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full permission grid by module */}
              {Object.entries(
                Object.entries(PERMISSIONS).reduce((acc, [key, val]) => {
                  if (!acc[val.module]) acc[val.module] = [];
                  acc[val.module].push({ key, ...val });
                  return acc;
                }, {})
              ).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{module}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {perms.map(({ key, label }) => {
                      const has = effectivePerms.includes(key);
                      const isExtra = has && !roleDefaults.includes(key);
                      const isRemoved = !has && roleDefaults.includes(key);
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                            isExtra ? 'bg-green-50 text-green-700' :
                            isRemoved ? 'bg-red-50 text-red-400 line-through' :
                            has ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          <PermissionDot has={has} />
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function UserAccessOverview() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [customFilter, setCustomFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-access-overview"],
    queryFn: () => base44.entities.Employee.list("-created_date", 200),
  });

  const allPermKeys = Object.keys(PERMISSIONS);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = !search ||
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.department?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      const hasCustom = emp.section_access && emp.section_access.length > 0;
      const matchCustom = customFilter === "all" ||
        (customFilter === "customized" && hasCustom) ||
        (customFilter === "default" && !hasCustom);
      return matchSearch && matchRole && matchCustom;
    });
  }, [employees, search, roleFilter, customFilter]);

  // Stats
  const customizedCount = employees.filter(e => e.section_access && e.section_access.length > 0).length;
  const roleBreakdown = employees.reduce((acc, e) => {
    acc[e.role] = (acc[e.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">User Access Overview</h1>
        <p className="text-slate-500 text-sm mt-1">All users, their roles, and effective permission levels at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <span className="text-xs text-slate-500 font-medium">Customized Access</span>
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
              <span className="text-xs text-slate-500 font-medium">Roles in Use</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(roleBreakdown).map(([role, count]) => (
                <span key={role} className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${ROLE_COLORS[role] || ROLE_COLORS.employee}`}>
                  {ROLE_LABELS[role] || role} ({count})
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
            placeholder="Search by name, email, or department..."
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
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="department_head">Dept Head</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="freelancer">Freelancer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={customFilter} onValueChange={setCustomFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Access Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Access Types</SelectItem>
            <SelectItem value="customized">Customized Only</SelectItem>
            <SelectItem value="default">Default Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Access Type</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No users match your filters.</td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <UserRow
                    key={emp.id}
                    emp={emp}
                    allPermKeys={allPermKeys}
                    expanded={expandedId === emp.id}
                    onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {employees.length} users
          </div>
        )}
      </Card>
    </div>
  );
}
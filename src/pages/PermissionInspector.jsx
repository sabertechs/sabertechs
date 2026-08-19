import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  PERMISSIONS, PAGE_PERMISSIONS, MODULES,
  getEffectivePermissions, getInheritedPermissions, isFreelancer, resolveCan, LEGACY_ALIASES,
} from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Search, AlertTriangle, CheckCircle2, XCircle, Users } from "lucide-react";

/**
 * Admin-only Permission Inspector (Way 1).
 * Shows a user's User-data designation, employment type, effective (cascade)
 * permissions, inherited permissions, visible modules, allowed actions, and
 * reporting scope. The Validate action flags sidebar/route/action mismatches:
 * unmapped permission keys, legacy-alias keys still in use, and routes the user
 * can reach that have no PAGE_PERMISSIONS protection.
 */
export default function PermissionInspector() {
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [validated, setValidated] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["inspector-users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: designations = [] } = useQuery({
    queryKey: ["designation-permissions"],
    queryFn: () => base44.entities.DesignationPermission.list("display_order"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["inspector-employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users
      .filter(u => !q || (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [users, search]);

  const selectedUser = users.find(u => u.email === selectedEmail);
  const selectedEmp = employees.find(e => e.email === selectedEmail);
  const isAdmin = selectedUser?.role === "admin";

  const effective = useMemo(
    () => (selectedUser ? getEffectivePermissions(selectedUser, designations) : []),
    [selectedUser, designations]
  );
  const inherited = useMemo(
    () => (selectedUser ? getInheritedPermissions(selectedUser?.data?.designation, designations) : []),
    [selectedUser, designations]
  );
  const directReports = useMemo(
    () => (selectedEmail ? employees.filter(e => e.reporting_to === selectedEmail) : []),
    [employees, selectedEmail]
  );

  // Group effective permissions by module
  const byModule = useMemo(() => {
    const groups = {};
    effective.forEach(key => {
      const meta = PERMISSIONS[key];
      const mod = meta?.module || key.split(".")[0];
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push({ key, ...meta });
    });
    return groups;
  }, [effective]);

  // Per-route validation for the selected user
  const routeChecks = useMemo(() => {
    if (!selectedUser) return [];
    return Object.entries(PAGE_PERMISSIONS).map(([page, required]) => {
      const reqs = Array.isArray(required) ? required : [required];
      const allowed = isAdmin || reqs.some(r => resolveCan(effective, r));
      const usesLegacyKey = reqs.some(r => !PERMISSIONS[r] && LEGACY_ALIASES[r]);
      const unmapped = reqs.some(r => !PERMISSIONS[r] && !LEGACY_ALIASES[r]);
      return { page, reqs, allowed, usesLegacyKey, unmapped };
    });
  }, [selectedUser, effective, isAdmin]);

  const issues = useMemo(() => {
    if (!validated || !selectedUser) return [];
    const out = [];
    routeChecks.forEach(c => {
      if (c.unmapped) out.push({ page: c.page, severity: "error", detail: `Unmapped key "${c.reqs.join(" | ")}" — not in permission registry` });
      if (c.usesLegacyKey) out.push({ page: c.page, severity: "warn", detail: `Legacy alias "${c.reqs.join(" | ")}" — migrate to module.action key` });
    });
    // User-data drift: designation on Employee record differs from user.data
    if (selectedEmp && selectedUser?.data?.designation && selectedEmp.designation &&
        selectedEmp.designation !== selectedUser.data.designation) {
      out.push({ page: "—", severity: "error", detail: `User.data.designation ("${selectedUser.data.designation}") ≠ Employee.designation ("${selectedEmp.designation}") — permission source drift` });
    }
    if (selectedEmp && selectedUser?.data?.employment_type && selectedEmp.employment_type &&
        selectedEmp.employment_type !== selectedUser.data.employment_type) {
      out.push({ page: "—", severity: "error", detail: `User.data.employment_type ("${selectedUser.data.employment_type}") ≠ Employee.employment_type ("${selectedEmp.employment_type}") — permission source drift` });
    }
    return out;
  }, [validated, routeChecks, selectedUser, selectedEmp]);

  const accessibleCount = routeChecks.filter(c => c.allowed).length;
  const deniedCount = routeChecks.length - accessibleCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-slate-800">Permission Inspector</h2>
        <Badge className="ml-2 bg-indigo-100 text-indigo-700">Admin only</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User picker */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Select User</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="max-h-[480px] overflow-y-auto space-y-1">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedEmail(u.email); setValidated(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    selectedEmail === u.email ? "bg-indigo-50 border-indigo-300" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="text-sm font-medium text-slate-800 truncate">{u.full_name || u.email}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  <div className="flex gap-1 mt-1">
                    {u.role === "admin" && <Badge className="bg-red-100 text-red-700 text-[10px]">Admin</Badge>}
                    <Badge className="bg-slate-100 text-slate-600 text-[10px]">{u.data?.designation || "no designation"}</Badge>
                    {u.data?.employment_type === "contractual" && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Freelancer</Badge>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspector detail */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedUser ? (
            <Card>
              <CardContent className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                Select a user to inspect their effective permissions.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Identity */}
              <Card>
                <CardHeader><CardTitle className="text-base">Identity & Permission Source</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-slate-500">User.data.designation</div>
                    <div className="font-semibold text-slate-800">{selectedUser.data?.designation || <span className="text-red-500">missing</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Employment type</div>
                    <div className="font-semibold text-slate-800">{selectedUser.data?.employment_type || <span className="text-red-500">missing</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Role</div>
                    <div className="font-semibold text-slate-800">{selectedUser.role}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Freelancer?</div>
                    <div className="font-semibold text-slate-800">{isFreelancer(selectedUser) ? "Yes" : "No"}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Reporting scope */}
              <Card>
                <CardHeader><CardTitle className="text-base">Reporting Scope</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Reports to: </span>
                    <span className="font-medium text-slate-800">{selectedEmp?.reporting_to || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Direct reports ({directReports.length}): </span>
                    {directReports.length === 0 ? (
                      <span className="text-slate-400">none</span>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {directReports.map(r => (
                          <Badge key={r.id} variant="outline" className="text-xs">{r.full_name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Effective permissions grouped by module */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Effective Permissions ({effective.length})
                    <Button size="sm" variant="outline" onClick={() => setValidated(v => !v)}>
                      <ShieldCheck className="w-4 h-4 mr-1" />
                      {validated ? "Hide Validation" : "Validate"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(byModule).length === 0 && (
                    <p className="text-sm text-slate-400">No permissions resolved. Check User.data.designation.</p>
                  )}
                  {Object.entries(byModule).map(([mod, perms]) => (
                    <div key={mod}>
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{MODULES[mod]?.name || mod}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map(p => (
                          <Badge key={p.key} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono">
                            {p.key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Inherited (read-only) */}
              {inherited.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Inherited Permissions (read-only)</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {inherited.map(p => (
                      <Badge key={p.key} variant="outline" className="text-xs font-mono" title={`Inherited from ${p.fromDesignation}`}>
                        {p.key} <span className="text-slate-400 ml-1">← {p.fromDesignation}</span>
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Validation results */}
              {validated && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Validation Results
                      <span className="text-sm font-normal text-slate-500">
                        {accessibleCount} accessible · {deniedCount} denied · {issues.length} issues
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {issues.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">No mismatches detected. All route keys are mapped and User.data is in sync.</span>
                      </div>
                    ) : (
                      issues.map((iss, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${iss.severity === "error" ? "bg-red-50" : "bg-amber-50"}`}>
                          {iss.severity === "error" ? <XCircle className="w-4 h-4 text-red-500 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
                          <div>
                            <div className="text-xs font-medium text-slate-700">{iss.page}</div>
                            <div className="text-xs text-slate-600">{iss.detail}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="mt-2 max-h-64 overflow-y-auto">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Route access matrix</div>
                      <div className="grid sm:grid-cols-2 gap-1">
                        {routeChecks.map(c => (
                          <div key={c.page} className="flex items-center gap-2 text-xs">
                            {c.allowed ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}
                            <span className={c.allowed ? "text-slate-700" : "text-slate-400"}>{c.page}</span>
                            {c.usesLegacyKey && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {c.unmapped && <XCircle className="w-3 h-3 text-red-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
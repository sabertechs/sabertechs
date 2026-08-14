import React from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { PERMISSIONS, MODULES } from "@/lib/permissions";

/**
 * Renders all permissions grouped by module, each with a Switch toggle.
 * Props:
 *   selectedPerms: string[] — currently enabled (own) permission keys
 *   onToggle(key): function — toggle a single permission
 *   onToggleModule(moduleName, permKeys): function — toggle all perms in a module
 *   inheritedPerms: array of { key, fromDesignation } — read-only inherited permissions shown greyed out
 */
export default function PermissionToggleGroups({ selectedPerms, onToggle, onToggleModule, inheritedPerms = [] }) {
  const modules = {};
  Object.entries(PERMISSIONS).forEach(([key, val]) => {
    if (!modules[val.module]) modules[val.module] = [];
    modules[val.module].push({ key, ...val });
  });

  // Map inherited perm key → source designation for quick lookup
  const inheritedMap = {};
  inheritedPerms.forEach(ip => { inheritedMap[ip.key] = ip.fromDesignation; });

  return (
    <div className="space-y-3">
      {Object.entries(modules).map(([moduleName, perms]) => {
        const ownSelected = perms.filter(p => selectedPerms.includes(p.key));
        const inheritedSelected = perms.filter(p => inheritedMap[p.key]);
        const selectedCount = ownSelected.length + inheritedSelected.length;
        const allSelected = selectedCount === perms.length;
        const hasInherited = inheritedSelected.length > 0;

        return (
          <div key={moduleName} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
              <Switch checked={allSelected} onCheckedChange={() => onToggleModule(moduleName, perms)} />
              <span className="font-semibold text-slate-700 flex-1 text-sm">{MODULES[moduleName]?.name || moduleName}</span>
              <Badge variant="outline" className="text-xs">
                {selectedCount}/{perms.length}
                {hasInherited && <span className="text-indigo-500 ml-1">({inheritedSelected.length} inh.)</span>}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-3">
              {perms.map(perm => {
                const isInherited = !!inheritedMap[perm.key];
                const isOwnSelected = selectedPerms.includes(perm.key);
                const isChecked = isOwnSelected || isInherited;

                return (
                  <div
                    key={perm.key}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      isInherited ? "bg-slate-50/50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"
                    }`}
                    onClick={() => !isInherited && onToggle(perm.key)}
                  >
                    <Switch
                      checked={isChecked}
                      onCheckedChange={() => !isInherited && onToggle(perm.key)}
                      onClick={e => e.stopPropagation()}
                      disabled={isInherited}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isInherited ? "text-slate-400" : "text-slate-800"}`}>{perm.label}</p>
                      <p className="text-xs text-slate-400">{perm.description}</p>
                    </div>
                    {isInherited && (
                      <Badge variant="outline" className="text-xs text-indigo-500 border-indigo-200 bg-indigo-50 flex items-center gap-1 flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        From {inheritedMap[perm.key]}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
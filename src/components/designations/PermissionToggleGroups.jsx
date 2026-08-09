import React from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Renders all permissions grouped by module, each with a Switch toggle.
 * Props:
 *   selectedPerms: string[] — currently enabled permission keys
 *   onToggle(key): function — toggle a single permission
 *   onToggleModule(moduleName, permKeys): function — toggle all perms in a module
 */
export default function PermissionToggleGroups({ selectedPerms, onToggle, onToggleModule }) {
  const modules = {};
  Object.entries(PERMISSIONS).forEach(([key, val]) => {
    if (!modules[val.module]) modules[val.module] = [];
    modules[val.module].push({ key, ...val });
  });

  return (
    <div className="space-y-3">
      {Object.entries(modules).map(([moduleName, perms]) => {
        const selectedCount = perms.filter(p => selectedPerms.includes(p.key)).length;
        const allSelected = selectedCount === perms.length;

        return (
          <div key={moduleName} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
              <Switch checked={allSelected} onCheckedChange={() => onToggleModule(moduleName, perms)} />
              <span className="font-semibold text-slate-700 flex-1 text-sm">{moduleName}</span>
              <Badge variant="outline" className="text-xs">{selectedCount}/{perms.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-3">
              {perms.map(perm => (
                <div
                  key={perm.key}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onToggle(perm.key)}
                >
                  <Switch
                    checked={selectedPerms.includes(perm.key)}
                    onCheckedChange={() => onToggle(perm.key)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{perm.label}</p>
                    <p className="text-xs text-slate-400">{perm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
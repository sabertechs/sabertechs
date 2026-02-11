import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Package, Users, Briefcase, Gamepad2, Shield, Settings, Save, AlertCircle } from "lucide-react";

const AVAILABLE_MODULES = [
  { id: 'assets', name: 'Assets Management', icon: Package, description: 'Manage company assets, assignments, and tracking' },
  { id: 'freelancers', name: 'Freelancers', icon: Users, description: 'Manage freelancers and their profiles' },
  { id: 'projects', name: 'Projects', icon: Briefcase, description: 'Manage projects, tasks, and assignments' },
  { id: 'games', name: 'Games & Arena', icon: Gamepad2, description: 'Office games and leaderboards' },
  { id: 'access_control', name: 'Access Control', icon: Shield, description: 'Module access management for users' }
];

export default function ModuleManagement() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [enabledModules, setEnabledModules] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: settings } = useQuery({
    queryKey: ['module-settings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.filter({ setting_key: 'enabled_modules' });
      return results[0];
    },
  });

  useEffect(() => {
    if (settings?.setting_value) {
      const modules = {};
      settings.setting_value.forEach(mod => {
        modules[mod.module_id] = mod.enabled;
      });
      setEnabledModules(modules);
    } else {
      // Default all modules enabled
      const defaultModules = {};
      AVAILABLE_MODULES.forEach(mod => {
        defaultModules[mod.id] = true;
      });
      setEnabledModules(defaultModules);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const moduleArray = Object.entries(enabledModules).map(([module_id, enabled]) => ({
        module_id,
        enabled
      }));

      if (settings?.id) {
        await base44.entities.AppSettings.update(settings.id, {
          setting_value: moduleArray
        });
      } else {
        await base44.entities.AppSettings.create({
          setting_key: 'enabled_modules',
          setting_value: moduleArray,
          description: 'Controls which modules are enabled in the application'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
      setHasChanges(false);
    }
  });

  const handleToggle = (moduleId) => {
    setEnabledModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
    setHasChanges(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            Module Management
          </h1>
          <p className="text-slate-500 mt-1">Enable or disable application modules</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Unsaved Changes</p>
            <p className="text-sm text-amber-600">You have unsaved changes. Click "Save Changes" to apply them.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {AVAILABLE_MODULES.map(module => (
          <Card key={module.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <module.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{module.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className={enabledModules[module.id] ? "text-green-600 font-medium" : "text-slate-400"}>
                    {enabledModules[module.id] ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    checked={enabledModules[module.id] || false}
                    onCheckedChange={() => handleToggle(module.id)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Disabling a module will hide it from navigation for all users. 
            Module data will be preserved and can be re-enabled at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
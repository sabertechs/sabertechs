import React from "react";
import { Building2, ShieldX, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Building2 className="w-12 h-12 text-white" />
          <h1 className="text-4xl font-bold text-white">SaberTechs</h1>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-300 mb-6">
            Your account is not registered as an employee in our system. 
            Please contact HR to get your employee profile created.
          </p>
          <Button 
            onClick={() => base44.auth.logout()}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
        
        <p className="text-slate-400 text-sm mt-6">
          If you believe this is an error, please contact your HR administrator.
        </p>
      </div>
    </div>
  );
}
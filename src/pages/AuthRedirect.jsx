import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";
import { createPageUrl } from "../utils";
import { getEffectivePermissions, getDesignationDashboard } from "@/lib/permissions";

export default function AuthRedirect() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Direct auth check - faster than separate isAuthenticated call
        const user = await base44.auth.me().catch(() => null);
        
        if (!user) {
          base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
          return;
        }

        // Dashboard comes only from User.data.designation and Designation Access.
        // The Employee entity is not used as an authorization source.
        const dpRows = await base44.entities.DesignationPermission.list('display_order');
        const perms = getEffectivePermissions(user, dpRows);
        if (user?.data?.designation) {
          window.location.href = createPageUrl(getDesignationDashboard(user, perms));
        } else {
          window.location.href = createPageUrl('Registration');
        }
      } catch (error) {
        console.error('Auth error:', error);
        base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
      }
    };

    checkAuthAndRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Building2 className="w-12 h-12 text-white" />
          <h1 className="text-4xl font-bold text-white">SaberTechs</h1>
        </div>
        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">{status}</p>
      </div>
    </div>
  );
}
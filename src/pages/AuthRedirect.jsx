import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";
import { createPageUrl } from "../utils";

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

        // Check if employee exists in database - case-insensitive match
        const userEmail = user.email.toLowerCase().trim();
        const allEmployees = await base44.entities.Employee.list();
        const employees = allEmployees.filter(emp => emp.email && emp.email.toLowerCase().trim() === userEmail);
        
        if (employees.length > 0) {
          const role = employees[0].role || 'employee';
          
          // Immediate redirect without delay
          if (role === 'hr' || role === 'manager') {
            window.location.href = createPageUrl('HRDashboard');
          } else if (role === 'department_head') {
            window.location.href = createPageUrl('DeptHeadDashboard');
          } else {
            window.location.href = createPageUrl('EmployeeDashboard');
          }
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
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";
import { createPageUrl } from "../utils";

export default function AuthRedirect() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is authenticated
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          // Not logged in - redirect to login
          setStatus("Redirecting to login...");
          base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
          return;
        }

        // User is logged in - get user data
        const user = await base44.auth.me();
        setStatus("Verifying employee records...");
        
        // Check if employee exists in database
        const employees = await base44.entities.Employee.filter({ email: user.email });
        
        if (employees.length > 0) {
          // Existing employee - check role and redirect
          const employee = employees[0];
          const role = employee.role || 'employee';
          
          setStatus(`Welcome back, ${employee.full_name || user.full_name}!`);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect based on role
          if (role === 'hr' || role === 'manager') {
            window.location.href = createPageUrl('HRDashboard');
          } else if (role === 'department_head') {
            window.location.href = createPageUrl('DeptHeadDashboard');
          } else {
            // employee or any other role
            window.location.href = createPageUrl('EmployeeDashboard');
          }
        } else {
          // New user - not in employee database - redirect to registration
          setStatus("Welcome! Completing your registration...");
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = createPageUrl('Registration');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setStatus("Error occurred. Retrying...");
        // Retry after delay
        setTimeout(() => window.location.reload(), 2000);
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
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Loader2 } from "lucide-react";
import { createPageUrl } from "../utils";

export default function AuthRedirect() {
  const [status, setStatus] = useState("Checking authentication...");

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          setStatus("Redirecting to login...");
          base44.auth.redirectToLogin(createPageUrl('AuthRedirect'));
          return;
        }

        const user = await base44.auth.me();
        setStatus("Checking employee records...");
        
        // Check if employee exists in database
        const employees = await base44.entities.Employee.filter({ email: user.email });
        
        if (employees.length > 0) {
          const employee = employees[0];
          const role = employee.role || 'employee';
          
          setStatus(`Welcome back! Redirecting to your dashboard...`);
          
          // Small delay for user feedback
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect based on role
          switch (role) {
            case 'hr':
            case 'manager':
              window.location.href = createPageUrl('HRDashboard');
              break;
            case 'department_head':
              window.location.href = createPageUrl('DeptHeadDashboard');
              break;
            case 'employee':
            default:
              window.location.href = createPageUrl('EmployeeDashboard');
              break;
          }
        } else {
          // New employee - redirect to registration
          setStatus("New user detected. Redirecting to registration...");
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = createPageUrl('Registration');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setStatus("Error checking authentication. Please try again.");
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
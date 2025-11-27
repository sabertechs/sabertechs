import React from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Users, ShieldCheck, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RoleSelection() {
  const handleLogin = (role) => {
    localStorage.setItem('selectedRole', role);
    base44.auth.redirectToLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-12 h-12 text-white" />
            <h1 className="text-4xl font-bold text-white">HRMS Portal</h1>
          </div>
          <p className="text-indigo-200 text-lg">Human Resource Management System</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* HR Option */}
          <Card 
            className="border-0 shadow-xl bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-all duration-300 cursor-pointer group"
            onClick={() => handleLogin('hr')}
          >
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">HR</h3>
              <p className="text-indigo-200 text-sm mb-6">
                Human Resources Management & Employee Administration
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Login as HR
              </Button>
            </CardContent>
          </Card>

          {/* Admin Option */}
          <Card 
            className="border-0 shadow-xl bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-all duration-300 cursor-pointer group"
            onClick={() => handleLogin('admin')}
          >
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCog className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Admin</h3>
              <p className="text-indigo-200 text-sm mb-6">
                System Administration & Department Management
              </p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                Login as Admin
              </Button>
            </CardContent>
          </Card>

          {/* Employee/Proctor Option */}
          <Card 
            className="border-0 shadow-xl bg-white/10 backdrop-blur-lg hover:bg-white/20 transition-all duration-300 cursor-pointer group"
            onClick={() => handleLogin('employee')}
          >
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Employee / Proctor</h3>
              <p className="text-indigo-200 text-sm mb-6">
                Employee Self-Service & Attendance Management
              </p>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Login as Employee
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-indigo-300 mt-10 text-sm">
          © 2024 HRMS Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  Receipt,
  Mail,
  ShieldCheck,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
  UserPlus,
  Shield,
  Settings,
  Megaphone,
  Newspaper,
  BookOpen,
  Package,
  Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import NotificationPopup from "@/components/notifications/NotificationPopup";
import ScheduledNotificationProcessor from "@/components/notifications/ScheduledNotificationProcessor";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          // Not logged in - redirect to login
          if (currentPageName !== "Registration" && currentPageName !== "Login") {
            base44.auth.redirectToLogin(window.location.href);
          }
          setLoading(false);
          return;
        }
        
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Use case-insensitive email matching
        const userEmail = userData.email.toLowerCase().trim();
        const allEmployees = await base44.entities.Employee.list();
        const employees = allEmployees.filter(emp => emp.email && emp.email.toLowerCase().trim() === userEmail);
        if (employees.length > 0) {
          const emp = employees[0];
          setEmployeeData(emp);
          
          // If on Registration page but employee exists, redirect to appropriate dashboard
          if (currentPageName === "Registration") {
            if (emp.role === 'hr' || emp.role === 'manager') {
              window.location.replace(createPageUrl("HRDashboard"));
            } else if (emp.role === 'department_head') {
              window.location.replace(createPageUrl("DeptHeadDashboard"));
            } else if (emp.employment_type === 'contractual') {
              window.location.replace(createPageUrl("FreelancerDashboard"));
            } else {
              window.location.replace(createPageUrl("EmployeeDashboard"));
            }
            return;
          }
        } else if (userData.role === 'admin') {
          // Admin users don't need employee record - treat as HR
          setEmployeeData({ role: 'hr', email: userData.email });
        } else {
          // No employee record - redirect to registration to complete profile
          if (currentPageName !== "Registration") {
            window.location.href = createPageUrl("Registration");
            return;
          }
        }
        setLoading(false);
      } catch (error) {
        console.log("User not logged in");
        if (currentPageName !== "Registration" && currentPageName !== "Login") {
          base44.auth.redirectToLogin(window.location.href);
        }
        setLoading(false);
      }
    };
    fetchUser();
  }, [currentPageName]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, is_read: false }),
    enabled: !!user?.email,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute instead of constantly
  });

  const userRole = useMemo(() => employeeData?.role || user?.role || 'employee', [employeeData?.role, user?.role]);

  const getNavItems = useCallback(() => {
    const items = [];
    const sectionAccess = employeeData?.section_access || [];
    const hasAccess = (sectionId) => sectionAccess.length === 0 || sectionAccess.includes(sectionId);

    // Dashboard based on role and employment type
    if (userRole === 'hr' || userRole === 'manager') {
      items.push({ name: "Dashboard", icon: LayoutDashboard, page: "HRDashboard" });
    } else if (userRole === 'department_head') {
      items.push({ name: "Dashboard", icon: LayoutDashboard, page: "DeptHeadDashboard" });
    } else if (employeeData?.employment_type === 'contractual') {
      items.push({ name: "Dashboard", icon: LayoutDashboard, page: "FreelancerDashboard" });
    } else {
      items.push({ name: "Dashboard", icon: LayoutDashboard, page: "EmployeeDashboard" });
    }

    // Role-based module access
    if (userRole === 'hr' || userRole === 'manager') {
      if (hasAccess('employees')) items.push({ name: "Employees", icon: Users, page: "Employees" });
      if (hasAccess('freelancers')) items.push({ name: "Freelancers", icon: Users, page: "Freelancers" });
      if (hasAccess('employee_upload')) items.push({ name: "Employee Upload", icon: UserPlus, page: "EmployeeUpload" });
      if (hasAccess('freelancer_upload')) items.push({ name: "Freelancer Upload", icon: UserPlus, page: "FreelancerUpload" });
      if (hasAccess('offer_letters')) items.push({ name: "Offer Letters", icon: Mail, page: "OfferLetterManagement" });
      if (hasAccess('attendance')) items.push({ name: "Attendance", icon: Clock, page: "AttendanceManagement" });
      if (hasAccess('payslips')) items.push({ name: "Payslips", icon: FileText, page: "PayslipManagement" });
      if (hasAccess('bg_verification')) items.push({ name: "BG Verification", icon: ShieldCheck, page: "BackgroundVerification" });
      if (hasAccess('api_verification')) items.push({ name: "API Verification", icon: ShieldCheck, page: "APIModule" });
      if (hasAccess('expenses')) items.push({ name: "Expenses", icon: Receipt, page: "ExpenseApproval" });
      if (hasAccess('assets')) items.push({ name: "Assets", icon: Package, page: "AssetDashboard" });
      if (hasAccess('company_feed')) items.push({ name: "Company Feed", icon: Newspaper, page: "CompanyFeed" });
      if (hasAccess('policies')) items.push({ name: "Policies", icon: BookOpen, page: "PolicyManagement" });
      if (hasAccess('notifications')) items.push({ name: "Notifications", icon: Megaphone, page: "NotificationCenter" });
      if (hasAccess('games')) items.push({ name: "Games", icon: Gamepad2, page: "OfficeOpsArena" });
      if (hasAccess('settings')) items.push({ name: "Settings", icon: Settings, page: "Settings" });
      items.push({ name: "Access Control", icon: Shield, page: "AccessControl" });
      } else if (userRole === 'department_head') {
      if (hasAccess('employees')) items.push({ name: "Employees", icon: Users, page: "Employees" });
      if (hasAccess('freelancers')) items.push({ name: "Freelancers", icon: Users, page: "Freelancers" });
      if (hasAccess('employee_upload')) items.push({ name: "Employee Upload", icon: UserPlus, page: "EmployeeUpload" });
      if (hasAccess('freelancer_upload')) items.push({ name: "Freelancer Upload", icon: UserPlus, page: "FreelancerUpload" });
      if (hasAccess('offer_letters')) items.push({ name: "Offer Letters", icon: Mail, page: "OfferLetterManagement" });
      if (hasAccess('attendance')) items.push({ name: "Attendance", icon: Clock, page: "AttendanceManagement" });
      if (hasAccess('payslips')) items.push({ name: "Payslips", icon: FileText, page: "PayslipManagement" });
      if (hasAccess('bg_verification')) items.push({ name: "BG Verification", icon: ShieldCheck, page: "BackgroundVerification" });
      if (hasAccess('expenses')) items.push({ name: "Expenses", icon: Receipt, page: "ExpenseApproval" });
      if (hasAccess('company_feed')) items.push({ name: "Company Feed", icon: Newspaper, page: "CompanyFeed" });
      if (hasAccess('policies')) items.push({ name: "Policies", icon: BookOpen, page: "PolicyManagement" });
      if (hasAccess('notifications')) items.push({ name: "Notifications", icon: Megaphone, page: "NotificationCenter" });
      if (hasAccess('games')) items.push({ name: "Games", icon: Gamepad2, page: "OfficeOpsArena" });
      items.push({ name: "Access Control", icon: Shield, page: "AccessControl" });
    } else {
      // Employee role - different menu for contractual vs permanent
      if (employeeData?.employment_type === 'contractual') {
        // Freelancers only see expenses and policies
        items.push({ name: "My Expenses", icon: Receipt, page: "MyExpenses" });
        items.push({ name: "Policies", icon: BookOpen, page: "CompanyPolicies" });
      } else {
        // Permanent employees - show pages based on section_access or defaults
        if (sectionAccess.includes('attendance') || sectionAccess.length === 0) {
          items.push({ name: "My Attendance", icon: Clock, page: "MyAttendance" });
        }
        if (sectionAccess.includes('payslips') || sectionAccess.length === 0) {
          items.push({ name: "My Payslips", icon: FileText, page: "MyPayslips" });
        }
        if (sectionAccess.includes('expenses') || sectionAccess.length === 0) {
          items.push({ name: "My Expenses", icon: Receipt, page: "MyExpenses" });
        }
        if (sectionAccess.includes('team_view')) {
          items.push({ name: "My Team", icon: Users, page: "TeamView" });
        }
        // All permanent employees can access policies, assets, and games
        items.push({ name: "Policies", icon: BookOpen, page: "CompanyPolicies" });
        items.push({ name: "My Assets", icon: Package, page: "MyAssets" });
        items.push({ name: "Games", icon: Gamepad2, page: "OfficeOpsArena" });
      }
    }

    return items;
  }, [userRole, employeeData?.section_access, employeeData?.employment_type]);

  const navItems = useMemo(() => getNavItems(), [getNavItems]);

  if (currentPageName === "Registration" || currentPageName === "Login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Notification Popup */}
                  <NotificationPopup userEmail={user?.email} />

                  {/* Background processor for scheduled notifications */}
                  {(userRole === 'hr' || userRole === 'manager' || userRole === 'department_head') && (
                    <ScheduledNotificationProcessor />
                  )}
      
      <style>{`
        :root {
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --accent: 210 40% 96.1%;
        }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2">
          <Menu className="w-6 h-6 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="w-7 h-7 text-indigo-600" />
          <span className="font-bold text-lg text-slate-800">SaberTechs</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("Notifications")} className="relative p-2">
            <Bell className="w-5 h-5 text-slate-600" />
            {notifications.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                {notifications.length}
              </Badge>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-16 lg:hover:w-72'}
          group
        `}
        onMouseEnter={() => !sidebarOpen && window.innerWidth >= 1024 && setSidebarOpen(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-8 h-8 text-indigo-600 flex-shrink-0" />
              <span className="font-bold text-xl text-slate-800 whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">SaberTechs</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-2 py-4 border-b border-slate-100 lg:group-hover:px-4 transition-all duration-300">
            <div className="flex items-center gap-3 p-2 lg:group-hover:p-3 rounded-xl bg-slate-50 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{userRole.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 lg:group-hover:px-4 py-4 space-y-1 overflow-y-auto transition-all duration-300">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 lg:group-hover:px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                      : 'text-slate-600 hover:bg-slate-100'
                    }
                  `}
                  title={item.name}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="font-medium whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-2 lg:group-hover:p-4 border-t border-slate-100 transition-all duration-300">
            <button
              onClick={() => base44.auth.logout(window.location.origin)}
              className="flex items-center gap-3 px-3 lg:group-hover:px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-16 min-h-screen pt-16 lg:pt-0 transition-all duration-300">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-slate-800">
            {navItems.find(item => item.page === currentPageName)?.name || currentPageName}
          </h1>
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Notifications")} className="relative p-2 hover:bg-slate-100 rounded-lg">
              <Bell className="w-5 h-5 text-slate-600" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user?.full_name?.[0] || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => base44.auth.logout(window.location.origin)}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
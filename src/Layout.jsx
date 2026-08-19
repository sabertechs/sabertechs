import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { getEffectivePermissions, getDesignationDashboard, isFreelancer, resolveCan, PAGE_PERMISSIONS } from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  Mail,
  ShieldCheck,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  UserPlus,
  Shield,
  Settings,
  Megaphone,
  Newspaper,
  BookOpen,
  Package,
  Gamepad2,
  Briefcase,
  ClipboardList,
  BarChart2
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
  const [expandedSections, setExpandedSections] = useState({ hrAdmin: true });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setLoading(false);
          return;
        }
        
        const userData = await base44.auth.me();
        setUser(userData);
        
        const employees = await base44.entities.Employee.filter({ email: userData.email });
        if (employees.length > 0) {
          const emp = employees[0];
          
          // Check if employee status is pending and not HR/manager
          const managerialDesignations = ['hr head', 'senior manager'];
          if (emp.status === 'pending' && !managerialDesignations.includes(emp.designation?.toLowerCase())) {
            // Redirect pending employees to registration to complete profile
            if (currentPageName !== "Registration") {
              window.location.href = createPageUrl("Registration");
              return;
            }
          }
          
          setEmployeeData(emp);

          // If on Registration page but employee exists with active status, redirect to appropriate dashboard
          if (currentPageName === "Registration" && emp.status === 'active') {
            if (userData.role === 'admin') {
              window.location.replace(createPageUrl("HRDashboard"));
            } else {
              const regPerms = getEffectivePermissions(userData, designationPermissions);
              window.location.replace(createPageUrl(getDesignationDashboard(userData, regPerms)));
            }
            return;
          }
        } else if (userData.role === 'admin') {
          // Admin users don't need employee record - treat as HR
          setEmployeeData({ designation: 'hr_head', email: userData.email });
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
        setLoading(false);
      }
    };
    fetchUser();
  }, [currentPageName]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, is_read: false }, '-created_date', 10),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: moduleSettings } = useQuery({
    queryKey: ['module-settings'],
    queryFn: async () => {
      const results = await base44.entities.AppSettings.filter({ setting_key: 'enabled_modules' });
      if (results.length > 0) {
        const modules = {};
        results[0].setting_value.forEach(mod => {
          modules[mod.module_id] = mod.enabled;
        });
        return modules;
      }
      return null;
    },
    enabled: !!user?.email,
    staleTime: 30 * 60 * 1000,  // module settings rarely change
    gcTime: 60 * 60 * 1000,
  });

  const { data: designationPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['designation-permissions'],
    queryFn: () => base44.entities.DesignationPermission.list('display_order'),
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  const isAdmin = user?.role === 'admin';
  // Way 1: permission source is user.data (designation + employment_type), not the Employee record.
  const perms = useMemo(() => getEffectivePermissions(user, designationPermissions), [user, designationPermissions]);
  const isFreelancerUser = useMemo(() => isFreelancer(user), [user]);
  const can = useCallback((permission) => isAdmin || resolveCan(perms, permission), [isAdmin, perms]);

  const getNavItems = useCallback(() => {
    const items = [];
    const isModuleEnabled = (moduleId) => !moduleSettings || moduleSettings[moduleId] !== false;

    // Dashboard
    const dashboardPage = isAdmin
      ? 'HRDashboard'
      : getDesignationDashboard(user, perms);
    items.push({ name: "Dashboard", icon: LayoutDashboard, page: dashboardPage });

    // Freelancer self-service
    if (isFreelancerUser) {
      if (can('projects.view') && isModuleEnabled('projects')) items.push({ name: "Projects", icon: Briefcase, page: "FreelancerProjects" });
      items.push({ name: "My Payslips", icon: FileText, page: "MyPayslips" });
      items.push({ name: "My Payroll", icon: DollarSign, page: "FreelancerPayrollView" });
      if (isModuleEnabled('company_feed')) items.push({ name: "Company Feed", icon: Newspaper, page: "CompanyFeed" });
      return items;
    }

    // Self-service (hidden if management equivalent exists)
    if (can('attendance.self.view') && !can('attendance.team.view') && isModuleEnabled('attendance')) items.push({ name: "My Attendance", icon: Clock, page: "MyAttendance" });
    items.push({ name: "My Payslips", icon: FileText, page: "MyPayslips" });
    if (can('expenses.self.submit') && !can('expenses.team.approve')) items.push({ name: "My Expenses", icon: Receipt, page: "MyExpenses" });
    if (can('system.team.view')) items.push({ name: "My Team", icon: Users, page: "TeamView" });
    if (can('comm.policies.view')) items.push({ name: "Policies", icon: BookOpen, page: "CompanyPolicies" });
    if (isModuleEnabled('assets')) items.push({ name: "My Assets", icon: Package, page: "MyAssets" });
    if (isModuleEnabled('games')) items.push({ name: "Games", icon: Gamepad2, page: "OfficeOpsArena" });
    if (isModuleEnabled('company_feed') && !can('feed.manage')) items.push({ name: "Company Feed", icon: Newspaper, page: "CompanyFeed" });

    // HR Admin section
    const hrAdminItems = [];
    if (can('hr.employees.view')) hrAdminItems.push({ name: "Employees", icon: Users, page: "Employees" });
    if (can('hr.employees.manage')) {
      hrAdminItems.push({ name: "Add Employee", icon: UserPlus, page: "AddEmployee" });
      hrAdminItems.push({ name: "Employee Upload", icon: UserPlus, page: "EmployeeUpload" });
    }
    if (can('hr.offer_letters')) hrAdminItems.push({ name: "Offer Letters", icon: Mail, page: "OfferLetterManagement" });
    if (can('hr.onboarding')) hrAdminItems.push({ name: "Onboarding", icon: ClipboardList, page: "OnboardingTemplates" });
    if (hrAdminItems.length > 0) {
      items.push({ name: "HR Admin", icon: Users, isSection: true, sectionId: "hrAdmin", children: hrAdminItems });
    }

    // Freelancer management
    if (can('freelancers.view') && isModuleEnabled('freelancers')) items.push({ name: "Freelancers", icon: Users, page: "Freelancers" });
    if (can('freelancers.manage') && isModuleEnabled('freelancers')) items.push({ name: "Freelancer Upload", icon: UserPlus, page: "FreelancerUpload" });
    if (can('payroll.freelancer.upload')) items.push({ name: "Payroll Upload", icon: DollarSign, page: "FreelancerPayrollUpload" });
    if (can('payroll.freelancer.records')) items.push({ name: "Payroll Records", icon: DollarSign, page: "AdminPayrollView" });

    // Operations
    if (can('attendance.team.view') && isModuleEnabled('attendance')) items.push({ name: "Attendance", icon: Clock, page: "AttendanceManagement" });
    if (can('payroll.employee.view') || can('payroll.employee.edit')) items.push({ name: "Payslips", icon: FileText, page: "PayslipManagement" });
    if (can('hr.bg_verification')) items.push({ name: "BG Verification", icon: ShieldCheck, page: "BackgroundVerification" });
    if (can('hr.api_verification')) items.push({ name: "API Verification", icon: ShieldCheck, page: "APIModule" });
    if (can('hr.bulk_pan')) items.push({ name: "Bulk PAN Verify", icon: ShieldCheck, page: "BulkPANVerification" });
    if (can('expenses.team.approve')) items.push({ name: "Expenses", icon: Receipt, page: "ExpenseApproval" });
    if (can('assets.manage') && isModuleEnabled('assets')) items.push({ name: "Assets", icon: Package, page: "AssetDashboard" });

    // Projects
    if (can('projects.view') && isModuleEnabled('projects')) items.push({ name: "Projects", icon: Briefcase, page: "ProjectManagement" });
    if (can('projects.task_templates') && isModuleEnabled('projects')) items.push({ name: "Task Templates", icon: ClipboardList, page: "TaskTemplates" });
    if (can('projects.analytics') && isModuleEnabled('projects')) items.push({ name: "Project Analytics", icon: LayoutDashboard, page: "ProjectAnalytics" });

    // Communication
    if (can('feed.manage') && isModuleEnabled('company_feed')) items.push({ name: "Company Feed", icon: Newspaper, page: "CompanyFeed" });
    if (can('comm.policies.manage')) items.push({ name: "Policies", icon: BookOpen, page: "PolicyManagement" });
    if (can('comm.notifications')) items.push({ name: "Notifications", icon: Megaphone, page: "NotificationCenter" });

    // Reports
    if (can('reports.view')) items.push({ name: "Reports", icon: BarChart2, page: "Reports" });

    // System
    if (can('system.settings')) items.push({ name: "Settings", icon: Settings, page: "Settings" });
    if (can('system.access_control')) items.push({ name: "Designation Access", icon: Shield, page: "DesignationPermissions" });
    if (can('system.module_management')) items.push({ name: "Module Management", icon: Settings, page: "ModuleManagement" });
    if (can('system.permission_inspector')) items.push({ name: "Permission Inspector", icon: ShieldCheck, page: "PermissionInspector" });

    return items;
  }, [isAdmin, perms, isFreelancerUser, employeeData, moduleSettings, designationPermissions]);

  const navItems = useMemo(() => getNavItems(), [getNavItems]);

  if (currentPageName === "Registration" || currentPageName === "Login") {
    return <>{children}</>;
  }

  // Wait for the permission cascade to load before gating routes (non-admins
  // need their Designation Access permissions to resolve can() correctly).
  if (loading || (!isAdmin && permsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Route protection: hidden sidebar items must not be directly accessible by
  // URL. Uses the same central resolver (can) as the sidebar.
  const requiredPerm = PAGE_PERMISSIONS[currentPageName];
  if (requiredPerm) {
    const allowed = Array.isArray(requiredPerm)
      ? requiredPerm.some(p => can(p))
      : can(requiredPerm);
    if (!allowed) {
      const dashboard = isAdmin ? 'HRDashboard' : getDesignationDashboard(employeeData, perms);
      return <Navigate to={createPageUrl(dashboard)} replace />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Notification Popup */}
                  <NotificationPopup userEmail={user?.email} />

                  {/* Background processor for scheduled notifications */}
                  {(isAdmin || can('comm.notifications')) && (
                    <ScheduledNotificationProcessor />
                  )}
      
      <style>{`
        :root {
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --accent: 210 40% 96.1%;
        }
        /* Prevent iOS bounce */
        html { height: 100%; }
        body { height: 100%; overflow: hidden; }
        #root { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        /* Improve tap targets */
        button, a { touch-action: manipulation; }
        /* Fix input zoom on iOS */
        input, select, textarea { font-size: 16px !important; }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-3" style={{paddingTop: 'env(safe-area-inset-top, 0px)'}}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg active:bg-slate-100 touch-manipulation">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-1.5">
          <Building2 className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-base text-slate-800">SaberTechs</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to={createPageUrl("Notifications")} className="relative p-2 rounded-lg active:bg-slate-100">
            <Bell className="w-5 h-5 text-slate-600" />
            {notifications.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 bg-red-500 text-xs">
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
                <p className="text-xs text-slate-500 capitalize">{(employeeData?.designation || (isAdmin ? 'Admin' : 'Employee')).replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 lg:group-hover:px-4 py-4 space-y-1 overflow-y-auto transition-all duration-300">
            {navItems.map((item) => {
              if (item.isSection) {
                const isExpanded = expandedSections[item.sectionId];
                const hasActiveChild = item.children?.some(child => child.page === currentPageName);
                
                return (
                  <div key={item.sectionId}>
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, [item.sectionId]: !prev[item.sectionId] }))}
                      className={`
                        w-full flex items-center gap-3 px-3 lg:group-hover:px-4 py-3 rounded-xl transition-all duration-200 text-left
                        ${hasActiveChild ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}
                      `}
                      title={item.name}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${hasActiveChild ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="flex-1 font-medium whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">{item.name}</span>
                      {isExpanded ? 
                        <ChevronDown className="w-4 h-4 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" /> : 
                        <ChevronRight className="w-4 h-4 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300" />
                      }
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children?.map((child) => {
                          const isActive = currentPageName === child.page;
                          return (
                            <Link
                              key={child.page}
                              to={createPageUrl(child.page)}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                flex items-center gap-3 px-3 lg:group-hover:px-4 py-2 rounded-lg transition-all duration-200
                                ${isActive 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'text-slate-600 hover:bg-slate-100'
                                }
                              `}
                              title={child.name}
                            >
                              <child.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              <span className="font-medium text-sm whitespace-nowrap lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              
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
              onClick={() => base44.auth.logout()}
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
      <main className="lg:ml-16 min-h-screen pt-14 lg:pt-0 transition-all duration-300">
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
                <DropdownMenuItem onClick={() => base44.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-3 lg:p-8 pb-6" style={{paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)'}}>
          {children}
        </div>
      </main>
    </div>
  );
}
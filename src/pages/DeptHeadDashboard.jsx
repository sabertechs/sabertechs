import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  Users, Receipt, CheckCircle, Clock, ChevronRight, 
  UserPlus, Mail, FileText, ShieldCheck, Shield, Settings,
  Calendar, TrendingUp, AlertCircle, CalendarClock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DeptHeadDashboard() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchUser();
  }, []);

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pendingExpenses = [] } = useQuery({
    queryKey: ['pendingExpenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'pending' }, '-created_date', 5),
    staleTime: 3 * 60 * 1000,
  });

  const { data: pendingOnboarding = [] } = useQuery({
    queryKey: ['pendingOnboarding'],
    queryFn: () => base44.entities.OnboardingChecklist.filter({ status: 'in_progress' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: () => base44.entities.Attendance.filter({ date: format(new Date(), 'yyyy-MM-dd') }),
    staleTime: 3 * 60 * 1000,
  });

  const permanentEmployees = useMemo(() => allEmployees.filter(e => e.employment_type === 'permanent' && e.status === 'active'), [allEmployees]);
  const teamMembers = useMemo(() => allEmployees.filter(e => e.employment_type === 'permanent'), [allEmployees]);
  const pendingBGV = useMemo(() => allEmployees.filter(e => e.bg_verification_status === 'pending'), [allEmployees]);

  // Calculate pending attendance
  const pendingAttendanceCount = permanentEmployees.filter(emp => 
    !todayAttendance.find(a => a.employee_email === emp.email)
  ).length;

  const quickActions = [
    { name: "Employees", icon: Users, page: "Employees", color: "bg-blue-100 text-blue-600", count: allEmployees.length },
    { name: "Employee Upload", icon: UserPlus, page: "EmployeeUpload", color: "bg-indigo-100 text-indigo-600" },
    { name: "Onboarding", icon: UserPlus, page: "OnboardingManagement", color: "bg-purple-100 text-purple-600", count: pendingOnboarding.length },
    { name: "Offer Letters", icon: Mail, page: "OfferLetterManagement", color: "bg-pink-100 text-pink-600" },
    { name: "Attendance", icon: Clock, page: "AttendanceManagement", color: "bg-cyan-100 text-cyan-600", count: pendingAttendanceCount },
    { name: "Payslips", icon: FileText, page: "PayslipManagement", color: "bg-emerald-100 text-emerald-600" },
    { name: "BG Verification", icon: ShieldCheck, page: "BackgroundVerification", color: "bg-amber-100 text-amber-600", count: pendingBGV.length },
    { name: "Expenses", icon: Receipt, page: "ExpenseApproval", color: "bg-orange-100 text-orange-600", count: pendingExpenses.length },
    { name: "Access Control", icon: Shield, page: "AccessControl", color: "bg-red-100 text-red-600" },
    { name: "Settings", icon: Settings, page: "Settings", color: "bg-slate-100 text-slate-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome, {user?.full_name?.split(' ')[0] || 'Department Head'}!
        </h1>
        <p className="text-indigo-100">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        <div className="mt-4 bg-white/20 rounded-lg px-4 py-2 inline-block">
          <p className="text-xs text-indigo-200">Department</p>
          <p className="font-semibold capitalize">{employee?.department || 'N/A'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{allEmployees.length}</p>
                <p className="text-sm text-slate-500">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{teamMembers.length}</p>
                <p className="text-sm text-slate-500">My Team</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingBGV.length}</p>
                <p className="text-sm text-slate-500">Pending BGV</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Receipt className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingExpenses.length}</p>
                <p className="text-sm text-slate-500">Pending Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Attendance Alert */}
      {pendingAttendanceCount > 0 && (
        <Link to={createPageUrl("AttendanceManagement")}>
          <Card className="border-0 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <CalendarClock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Pending Attendance Today</p>
                    <p className="text-sm text-slate-500">{pendingAttendanceCount} permanent employee(s) haven't marked attendance</p>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-700 text-lg px-4 py-2">
                  {pendingAttendanceCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions Grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link key={action.page} to={createPageUrl(action.page)}>
                <div className="relative p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-center group">
                  <div className={`w-12 h-12 mx-auto rounded-xl ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{action.name}</p>
                  {action.count > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {action.count}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
            <Link to={createPageUrl("TeamView")}>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {member.full_name?.[0] || 'E'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{member.full_name}</p>
                      <p className="text-sm text-slate-500">{member.designation || 'Employee'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Expenses */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Pending Expense Approvals</CardTitle>
            <Link to={createPageUrl("ExpenseApproval")}>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingExpenses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto text-green-300 mb-2" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingExpenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800">{expense.employee_name}</p>
                      <p className="text-sm text-slate-500 capitalize">{expense.expense_type?.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">₹{expense.amount?.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{format(new Date(expense.date), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
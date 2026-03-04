import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  FileText,
  Receipt,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CalendarClock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HRDashboard() {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['hr-pending-expenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'pending' }, '-created_date', 5),
    staleTime: 3 * 60 * 1000,
  });

  const { data: pendingVerifications = [] } = useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: () => base44.entities.Employee.filter({ bg_verification_status: 'pending' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['todayAttendance'],
    queryFn: () => base44.entities.Attendance.filter({ date: format(new Date(), 'yyyy-MM-dd') }),
    staleTime: 3 * 60 * 1000,
  });

  // Calculate pending attendance
  const permanentEmployees = employees.filter(e => e.employment_type === 'permanent' && e.status === 'active');
  const pendingAttendanceCount = permanentEmployees.filter(emp => 
    !attendance.find(a => a.employee_email === emp.email)
  ).length;

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    pendingEmployees: employees.filter(e => e.status === 'pending').length,
    pendingExpenses: expenses.length,
    pendingBGV: pendingVerifications.length,
    pendingAttendance: pendingAttendanceCount
  };

  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Total Employees</p>
                <p className="text-3xl font-bold mt-1">{stats.totalEmployees}</p>
              </div>
              <Users className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active</p>
                <p className="text-3xl font-bold mt-1">{stats.activeEmployees}</p>
              </div>
              <UserCheck className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pending Onboarding</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingEmployees}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Pending BGV</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingBGV}</p>
              </div>
              <ShieldCheck className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Attendance Alert */}
      {stats.pendingAttendance > 0 && (
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
                    <p className="text-sm text-slate-500">{stats.pendingAttendance} permanent employee(s) haven't marked attendance</p>
                  </div>
                </div>
                <Badge className="bg-orange-100 text-orange-700 text-lg px-4 py-2">
                  {stats.pendingAttendance}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={createPageUrl("Employees")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
              <p className="font-medium text-slate-800">Manage Employees</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("OfferLetterManagement")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-slate-800">Offer Letters</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("ExpenseApproval")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Receipt className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <p className="font-medium text-slate-800">Expenses</p>
              {stats.pendingExpenses > 0 && (
                <Badge className="mt-2 bg-amber-100 text-amber-700">{stats.pendingExpenses} pending</Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("BackgroundVerification")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <ShieldCheck className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="font-medium text-slate-800">BG Verification</p>
              {stats.pendingBGV > 0 && (
                <Badge className="mt-2 bg-purple-100 text-purple-700">{stats.pendingBGV} pending</Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(departmentStats).map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{dept}</span>
                      <span className="text-sm text-slate-500">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(count / stats.totalEmployees) * 100}%` }}
                      />
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
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p>No pending expenses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
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

      {/* Recent Employees */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Employees</CardTitle>
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.slice(0, 5).map((emp) => (
              <div key={emp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                  {emp.full_name?.[0] || 'E'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{emp.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize truncate">{emp.department || emp.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`text-xs ${
                    emp.status === 'active' ? 'bg-green-100 text-green-700' :
                    emp.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {emp.status}
                  </Badge>
                  <Badge className={`text-xs ${
                    emp.bg_verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                    emp.bg_verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {emp.bg_verification_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
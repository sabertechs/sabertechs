import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from "date-fns";
import {
  Clock,
  FileText,
  Receipt,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EditProfileSection from "@/components/employee/EditProfileSection";
import CompanyFeed from "@/components/feed/CompanyFeed";
import OnboardingChecklistCard from "@/components/onboarding/OnboardingChecklistCard";

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);

  const fetchEmployee = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
    const employees = await base44.entities.Employee.filter({ email: userData.email });
    if (employees.length > 0) setEmployee(employees[0]);
  };

  useEffect(() => {
    fetchEmployee();
  }, []);

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', user?.email],
    queryFn: () => base44.entities.Attendance.filter({ employee_email: user?.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user?.email }, '-created_date', 5),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: onboardingChecklists = [] } = useQuery({
    queryKey: ['onboarding-checklist', user?.email],
    queryFn: () => base44.entities.OnboardingChecklist.filter({ employee_email: user?.email, status: 'in_progress' }),
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000,
  });

  const currentMonth = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getAttendanceForDay = (date) => {
    return attendance.find(a => a.date === format(date, 'yyyy-MM-dd'));
  };

  const stats = {
    presentDays: attendance.filter(a => a.status === 'present').length,
    absentDays: attendance.filter(a => a.status === 'absent').length,
    leaveDays: attendance.filter(a => a.status === 'leave').length,
    pendingExpenses: expenses.filter(e => e.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Employee'}!
        </h1>
        <p className="text-indigo-100">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        {employee && (
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-xs text-indigo-200">Department</p>
              <p className="font-semibold capitalize">{employee.department || 'N/A'}</p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2">
              <p className="text-xs text-indigo-200">Designation</p>
              <p className="font-semibold">{employee.designation || 'N/A'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.presentDays}</p>
                <p className="text-sm text-slate-500">Present Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.absentDays}</p>
                <p className="text-sm text-slate-500">Absent Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.leaveDays}</p>
                <p className="text-sm text-slate-500">Leave Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Receipt className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pendingExpenses}</p>
                <p className="text-sm text-slate-500">Pending Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Calendar */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Attendance - {format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Link to={createPageUrl("MyAttendance")}>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-slate-400 py-2">
                  {day}
                </div>
              ))}
              {Array(daysInMonth[0].getDay()).fill(null).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {daysInMonth.map((day) => {
                const att = getAttendanceForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-lg
                      ${isToday(day) ? 'ring-2 ring-indigo-500 font-bold' : ''}
                      ${att?.status === 'present' ? 'bg-green-100 text-green-700' : ''}
                      ${att?.status === 'absent' ? 'bg-red-100 text-red-700' : ''}
                      ${att?.status === 'leave' ? 'bg-amber-100 text-amber-700' : ''}
                      ${att?.status === 'holiday' ? 'bg-purple-100 text-purple-700' : ''}
                      ${!att ? 'text-slate-400' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-xs text-slate-600">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-xs text-slate-600">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-600">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400" />
                <span className="text-xs text-slate-600">Holiday</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Feed */}
        <CompanyFeed user={user} limit={3} />
      </div>

      {/* Onboarding Checklist */}
      {onboardingChecklists.length > 0 && (
        <div className="space-y-4">
          {onboardingChecklists.map(checklist => (
            <OnboardingChecklistCard key={checklist.id} checklist={checklist} userEmail={user?.email} />
          ))}
        </div>
      )}

      {/* My Profile Section */}
      {employee && (
        <EditProfileSection employee={employee} onUpdate={fetchEmployee} />
      )}

      {/* Recent Expenses */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Expenses</CardTitle>
          <Link to={createPageUrl("MyExpenses")}>
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No expenses submitted yet</p>
              <Link to={createPageUrl("MyExpenses")}>
                <Button className="mt-4" variant="outline">Submit Expense</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-sm font-medium text-slate-500">Type</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Amount</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-50">
                      <td className="py-4 capitalize">{expense.expense_type?.replace('_', ' ')}</td>
                      <td className="py-4 text-slate-600">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                      <td className="py-4 font-medium">₹{expense.amount?.toLocaleString()}</td>
                      <td className="py-4">
                        <Badge className={
                          expense.status === 'approved' ? 'bg-green-100 text-green-700' :
                          expense.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {expense.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, Calendar, LogIn, LogOut, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function MyAttendance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      // Fetch employee record - use case-insensitive matching
      const userEmail = userData.email.toLowerCase().trim();
      const allEmployees = await base44.entities.Employee.list();
      const matchedEmployee = allEmployees.find(emp => emp.email?.toLowerCase().trim() === userEmail);
      if (matchedEmployee) {
        setEmployee(matchedEmployee);
      }
    };
    fetchUser();
  }, []);

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', user?.email],
    queryFn: () => base44.entities.Attendance.filter({ employee_email: user?.email }),
    enabled: !!user?.email,
  });

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getAttendanceForDay = (date) => {
    return attendance.find(a => a.date === format(date, 'yyyy-MM-dd'));
  };

  const monthlyStats = {
    present: attendance.filter(a => {
      const date = new Date(a.date);
      return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth) && a.status === 'present';
    }).length,
    absent: attendance.filter(a => {
      const date = new Date(a.date);
      return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth) && a.status === 'absent';
    }).length,
    leave: attendance.filter(a => {
      const date = new Date(a.date);
      return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth) && a.status === 'leave';
    }).length,
    halfDay: attendance.filter(a => {
      const date = new Date(a.date);
      return date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth) && a.status === 'half_day';
    }).length
  };

  const statusColors = {
    present: 'bg-green-100 text-green-700 border-green-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    leave: 'bg-amber-100 text-amber-700 border-amber-200',
    half_day: 'bg-blue-100 text-blue-700 border-blue-200',
    holiday: 'bg-purple-100 text-purple-700 border-purple-200',
    pending: 'bg-orange-100 text-orange-700 border-orange-200'
  };

  // Check if permanent employee
  const isPermanent = employee?.employment_type === 'permanent';
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.find(a => a.date === today);
  const hasCheckedIn = todayAttendance?.check_in;
  const hasCheckedOut = todayAttendance?.check_out;

  const handleCheckIn = async () => {
    if (!isPermanent) {
      toast.error('Only permanent employees can mark attendance');
      return;
    }
    setMarking(true);
    try {
      const now = format(new Date(), 'HH:mm');
      await base44.entities.Attendance.create({
        employee_email: user.email,
        employee_id: employee?.employee_id,
        date: today,
        check_in: now,
        status: 'present',
        marked_by: user.email,
        marked_by_role: 'self'
      });
      queryClient.invalidateQueries(['attendance']);
      toast.success('Check-in recorded successfully');
    } catch (error) {
      toast.error('Failed to check in');
    }
    setMarking(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    setMarking(true);
    try {
      const now = format(new Date(), 'HH:mm');
      const workingHours = calculateWorkingHours(todayAttendance.check_in, now);
      await base44.entities.Attendance.update(todayAttendance.id, {
        check_out: now,
        working_hours: workingHours
      });
      queryClient.invalidateQueries(['attendance']);
      toast.success('Check-out recorded successfully');
    } catch (error) {
      toast.error('Failed to check out');
    }
    setMarking(false);
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    return ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Attendance</h2>
          <p className="text-slate-500">Track your attendance records</p>
        </div>
        
        {/* Check In/Out Buttons - Only for permanent employees */}
        {isPermanent ? (
          <div className="flex items-center gap-3">
            {!hasCheckedIn ? (
              <Button onClick={handleCheckIn} disabled={marking} className="bg-green-600 hover:bg-green-700">
                {marking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                Check In
              </Button>
            ) : !hasCheckedOut ? (
              <Button onClick={handleCheckOut} disabled={marking} className="bg-red-600 hover:bg-red-700">
                {marking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Check Out
              </Button>
            ) : (
              <Badge className="bg-green-100 text-green-700 py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-2" />
                Attendance Marked: {todayAttendance.check_in} - {todayAttendance.check_out}
              </Badge>
            )}
          </div>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 py-2 px-4">
            <AlertCircle className="w-4 h-4 mr-2" />
            Contractual employees: Contact supervisor for attendance
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{monthlyStats.present}</p>
                <p className="text-sm text-slate-500">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{monthlyStats.absent}</p>
                <p className="text-sm text-slate-500">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{monthlyStats.leave}</p>
                <p className="text-sm text-slate-500">Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{monthlyStats.halfDay}</p>
                <p className="text-sm text-slate-500">Half Day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
            {Array(daysInMonth[0].getDay()).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((day) => {
              const att = getAttendanceForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    p-2 md:p-4 rounded-xl text-center transition-all
                    ${isToday ? 'ring-2 ring-indigo-500' : ''}
                    ${att ? statusColors[att.status] : 'bg-slate-50'}
                  `}
                >
                  <p className="text-sm font-medium">{format(day, 'd')}</p>
                  {att && (
                    <p className="text-xs mt-1 capitalize hidden md:block">{att.status?.replace('_', ' ')}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-400" />
              <span className="text-sm text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-400" />
              <span className="text-sm text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-400" />
              <span className="text-sm text-slate-600">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-400" />
              <span className="text-sm text-slate-600">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-400" />
              <span className="text-sm text-slate-600">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Check In</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Check Out</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Hours</th>
                  <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((att) => (
                  <tr key={att.id} className="border-b border-slate-50">
                    <td className="py-4 font-medium">{format(new Date(att.date), 'MMM d, yyyy')}</td>
                    <td className="py-4 text-slate-600">{att.check_in || '-'}</td>
                    <td className="py-4 text-slate-600">{att.check_out || '-'}</td>
                    <td className="py-4 text-slate-600">{att.working_hours ? `${att.working_hours}h` : '-'}</td>
                    <td className="py-4">
                      <Badge className={statusColors[att.status]}>
                        {att.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { Search, Plus, ChevronLeft, ChevronRight, Edit, Trash2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AttendanceManagement() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [formData, setFormData] = useState({
    employee_email: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in: "",
    check_out: "",
    status: "present",
    notes: "",
    supervisor_note: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Filter only permanent employees for attendance marking
  const permanentEmployees = employees.filter(e => e.employment_type === 'permanent' && e.status === 'active');

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
      setShowAddDialog(false);
      setSelectedAttendance(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['attendance'])
  });

  const resetForm = () => {
    setFormData({
      employee_email: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      check_in: "",
      check_out: "",
      status: "present",
      notes: "",
      supervisor_note: ""
    });
  };

  const handleSubmit = () => {
    const emp = employees.find(e => e.email === formData.employee_email);
    
    // Check if employee is permanent
    if (emp && emp.employment_type !== 'permanent') {
      toast.error('Only permanent employees can have attendance marked');
      return;
    }
    
    const data = {
      ...formData,
      employee_id: emp?.employee_id,
      working_hours: formData.check_in && formData.check_out ? 
        calculateWorkingHours(formData.check_in, formData.check_out) : null,
      marked_by: user?.email,
      marked_by_role: 'supervisor',
      supervisor_note: formData.supervisor_note
    };

    if (selectedAttendance) {
      updateMutation.mutate({ id: selectedAttendance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    return ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
  };

  const handleEdit = (att) => {
    setSelectedAttendance(att);
    setFormData({
      employee_email: att.employee_email,
      date: att.date,
      check_in: att.check_in || "",
      check_out: att.check_out || "",
      status: att.status,
      notes: att.notes || "",
      supervisor_note: att.supervisor_note || ""
    });
    setShowAddDialog(true);
  };

  const filteredAttendance = attendance.filter(att => {
    const date = new Date(att.date);
    const inMonth = date >= startOfMonth(currentMonth) && date <= endOfMonth(currentMonth);
    const matchesSearch = att.employee_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || att.status === statusFilter;
    return inMonth && (search === "" || matchesSearch) && matchesStatus;
  });

  // Count pending attendance (employees who haven't marked today)
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter(a => a.date === today);
  const pendingCount = permanentEmployees.filter(emp => 
    !todayAttendance.find(a => a.employee_email === emp.email)
  ).length;

  const statusColors = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    leave: 'bg-amber-100 text-amber-700',
    half_day: 'bg-blue-100 text-blue-700',
    holiday: 'bg-purple-100 text-purple-700',
    pending: 'bg-orange-100 text-orange-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Attendance Management</h2>
          <p className="text-slate-500">Track and manage employee attendance (Permanent employees only)</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700 py-2 px-4">
              <Clock className="w-4 h-4 mr-2" />
              {pendingCount} Pending Today
            </Badge>
          )}
          <Button onClick={() => { resetForm(); setSelectedAttendance(null); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Attendance Section */}
      {pendingCount > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Pending Attendance Today ({pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {permanentEmployees
                .filter(emp => !todayAttendance.find(a => a.employee_email === emp.email))
                .slice(0, 10)
                .map(emp => (
                  <Badge 
                    key={emp.id} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      setFormData({ ...formData, employee_email: emp.email, date: today });
                      setSelectedAttendance(null);
                      setShowAddDialog(true);
                    }}
                  >
                    {emp.full_name}
                  </Badge>
                ))}
              {pendingCount > 10 && <Badge variant="outline">+{pendingCount - 10} more</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Check In</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Check Out</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Hours</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Marked By</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((att) => (
                  <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-800">{att.employee_email}</td>
                    <td className="px-6 py-4 text-slate-600">{format(new Date(att.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-slate-600">{att.check_in || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{att.check_out || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{att.working_hours ? `${att.working_hours.toFixed(1)}h` : '-'}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusColors[att.status]}>
                        {att.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className={att.marked_by_role === 'supervisor' ? 'text-indigo-600 font-medium' : 'text-slate-500'}>
                          {att.marked_by_role === 'supervisor' ? 'Supervisor' : 'Self'}
                        </span>
                        {att.supervisor_note && (
                          <p className="text-xs text-slate-400 mt-1 truncate max-w-[150px]" title={att.supervisor_note}>
                            Note: {att.supervisor_note}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(att)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(att.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAttendance ? 'Edit Attendance' : 'Add Attendance'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={formData.employee_email} onValueChange={(v) => setFormData({ ...formData, employee_email: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permanent employee" />
                </SelectTrigger>
                <SelectContent>
                  {permanentEmployees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>{emp.full_name} ({emp.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Only permanent employees can have attendance marked</p>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check In</Label>
                <Input
                  type="time"
                  value={formData.check_in}
                  onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check Out</Label>
                <Input
                  type="time"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <div className="space-y-2">
              <Label>Supervisor Note *</Label>
              <Textarea
                value={formData.supervisor_note}
                onChange={(e) => setFormData({ ...formData, supervisor_note: e.target.value })}
                placeholder="Reason for marking attendance (e.g., Employee forgot to mark, system issue, etc.)"
                rows={3}
              />
              <p className="text-xs text-slate-500">Required when supervisor marks attendance</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
              {selectedAttendance ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
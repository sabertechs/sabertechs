import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ReportShell from "./ReportShell";
import { downloadCSV, formatDate } from "./reportUtils";

export default function AttendanceReport({ onBack }) {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [markedByFilter, setMarkedByFilter] = useState("all");

  const { data: attendance = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["attendance-report"],
    queryFn: () => base44.entities.Attendance.list("-date", 2000),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-report"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
  });

  const empMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.email] = e; });
    return m;
  }, [employees]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const filtered = useMemo(() => {
    return attendance.filter(att => {
      if (att.date < dateFrom || att.date > dateTo) return false;
      if (statusFilter !== "all" && att.status !== statusFilter) return false;
      if (markedByFilter !== "all" && att.marked_by_role !== markedByFilter) return false;
      if (employeeFilter !== "all" && att.employee_email !== employeeFilter) return false;
      if (deptFilter !== "all") {
        const emp = empMap[att.employee_email];
        if (!emp || emp.department !== deptFilter) return false;
      }
      return true;
    });
  }, [attendance, dateFrom, dateTo, statusFilter, employeeFilter, deptFilter, markedByFilter, empMap]);

  const statusColors = {
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    leave: "bg-amber-100 text-amber-700",
    half_day: "bg-blue-100 text-blue-700",
    holiday: "bg-purple-100 text-purple-700",
    pending: "bg-orange-100 text-orange-700",
  };

  const handleDownload = () => {
    const rows = filtered.map(att => {
      const emp = empMap[att.employee_email] || {};
      return {
        Date: formatDate(att.date),
        Employee_Email: att.employee_email,
        Employee_Name: emp.full_name || "",
        Department: emp.department || "",
        Designation: emp.designation || "",
        Status: att.status,
        Check_In: att.check_in || "",
        Check_Out: att.check_out || "",
        Working_Hours: att.working_hours ?? "",
        Marked_By_Role: att.marked_by_role || "",
        Marked_By: att.marked_by || "",
        Notes: att.notes || "",
        Supervisor_Note: att.supervisor_note || "",
      };
    });
    downloadCSV(rows, `Attendance_Report_${dateFrom}_to_${dateTo}.csv`);
  };

  // Summary
  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, leave: 0, half_day: 0, holiday: 0, pending: 0 };
    filtered.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    return counts;
  }, [filtered]);

  return (
    <ReportShell
      title="Attendance Report"
      description="Filter by date range, employee, department, status"
      onBack={onBack}
      onDownload={handleDownload}
      loading={loadingAtt}
      rowCount={filtered.length}
    >
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Marked By</Label>
              <Select value={markedByFilter} onValueChange={setMarkedByFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.filter(e => e.employment_type === "permanent").map(e => (
                    <SelectItem key={e.email} value={e.email}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(summary).map(([status, count]) => (
          <Card key={status} className="border-0 shadow-sm text-center py-4">
            <div className="text-2xl font-bold text-slate-800">{count}</div>
            <div className="text-xs text-slate-500 capitalize mt-1">{status.replace("_", " ")}</div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["Date", "Employee", "Department", "Status", "Check In", "Check Out", "Hours", "Marked By"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-400">No records found</td></tr>
                ) : filtered.map(att => {
                  const emp = empMap[att.employee_email] || {};
                  return (
                    <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">{formatDate(att.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{emp.full_name || att.employee_email}</div>
                        <div className="text-xs text-slate-400">{att.employee_email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.department || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[att.status] || ""}>{att.status?.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{att.check_in || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{att.check_out || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{att.working_hours ? `${att.working_hours.toFixed(1)}h` : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={att.marked_by_role === "supervisor" ? "text-indigo-600 font-medium" : "text-slate-500"}>
                          {att.marked_by_role === "supervisor" ? "Supervisor" : "Self"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
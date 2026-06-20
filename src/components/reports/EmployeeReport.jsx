import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ReportShell from "./ReportShell";
import { downloadCSV, formatDate } from "./reportUtils";

export default function EmployeeReport({ onBack }) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [empTypeFilter, setEmpTypeFilter] = useState("all");
  const [bgvFilter, setBgvFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-report"],
    queryFn: () => base44.entities.Employee.list("-created_date", 1000),
  });

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      if (roleFilter !== "all" && emp.role !== roleFilter) return false;
      if (statusFilter !== "all" && emp.status !== statusFilter) return false;
      if (deptFilter !== "all" && emp.department !== deptFilter) return false;
      if (empTypeFilter !== "all" && emp.employment_type !== empTypeFilter) return false;
      if (bgvFilter !== "all" && emp.bg_verification_status !== bgvFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          emp.full_name?.toLowerCase().includes(q) ||
          emp.email?.toLowerCase().includes(q) ||
          emp.employee_id?.toLowerCase().includes(q) ||
          emp.phone?.includes(q)
        );
      }
      return true;
    });
  }, [employees, roleFilter, statusFilter, deptFilter, empTypeFilter, bgvFilter, search]);

  const statusColors = {
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    inactive: "bg-slate-100 text-slate-600",
    terminated: "bg-red-100 text-red-700",
  };

  const handleDownload = () => {
    const rows = filtered.map(emp => ({
      Employee_ID: emp.employee_id || "",
      Full_Name: emp.full_name || "",
      Email: emp.email || "",
      Phone: emp.phone || "",
      Department: emp.department || "",
      Designation: emp.designation || "",
      Role: emp.role || "",
      Employment_Type: emp.employment_type || "",
      Status: emp.status || "",
      Date_of_Joining: formatDate(emp.date_of_joining),
      Date_of_Birth: formatDate(emp.date_of_birth),
      Gender: emp.gender || "",
      City: emp.city || "",
      State: emp.state || "",
      Salary: emp.salary ?? "",
      Reporting_To: emp.reporting_to || "",
      BG_Verification: emp.bg_verification_status || "",
      Aadhaar_Number: emp.aadhaar_number || "",
      PAN_Number: emp.pan_number || "",
      Bank_Name: emp.bank_name || "",
      Bank_Account: emp.bank_account_number || "",
      Bank_IFSC: emp.bank_ifsc || "",
    }));
    downloadCSV(rows, "Employee_Report.csv");
  };

  return (
    <ReportShell
      title="Employee Report"
      description="Filter employees by role, department, status, employment type"
      onBack={onBack}
      onDownload={handleDownload}
      loading={isLoading}
      rowCount={filtered.length}
    >
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1 lg:col-span-2">
              <Label>Search</Label>
              <Input placeholder="Name, email, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="department_head">Dept Head</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
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
              <Label>Employment Type</Label>
              <Select value={empTypeFilter} onValueChange={setEmpTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contractual">Contractual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>BGV Status</Label>
              <Select value={bgvFilter} onValueChange={setBgvFilter}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["ID", "Name", "Email", "Department", "Designation", "Role", "Type", "Status", "Joining Date", "BGV"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-400">No records found</td></tr>
                ) : filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 text-xs">{emp.employee_id || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{emp.full_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{emp.email}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.department || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{emp.designation || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{emp.role?.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{emp.employment_type || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[emp.status] || ""}>{emp.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(emp.date_of_joining)}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        emp.bg_verification_status === "approved" ? "bg-green-100 text-green-700" :
                        emp.bg_verification_status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }>{emp.bg_verification_status || "pending"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
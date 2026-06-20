import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Clock, Briefcase, DollarSign, BarChart2 } from "lucide-react";
import AttendanceReport from "@/components/reports/AttendanceReport";
import FreelancerReport from "@/components/reports/FreelancerReport";
import ProjectReport from "@/components/reports/ProjectReport";
import PayrollReport from "@/components/reports/PayrollReport";
import EmployeeReport from "@/components/reports/EmployeeReport";

const REPORT_TYPES = [
  {
    id: "attendance",
    label: "Attendance Report",
    description: "Monthly/date-range attendance with status breakdown per employee",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "employee",
    label: "Employee Report",
    description: "Employee directory with department, role, status filters",
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    id: "freelancer",
    label: "Freelancer Report",
    description: "Freelancer applications, payroll, and project assignments",
    icon: BarChart2,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: "project",
    label: "Project Report",
    description: "Projects with slot fill rates, applications, and group details",
    icon: Briefcase,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    id: "payroll",
    label: "Payroll Report",
    description: "Freelancer payroll records by month, project, or employee",
    icon: DollarSign,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);

  const renderReport = () => {
    switch (activeReport) {
      case "attendance": return <AttendanceReport onBack={() => setActiveReport(null)} />;
      case "employee": return <EmployeeReport onBack={() => setActiveReport(null)} />;
      case "freelancer": return <FreelancerReport onBack={() => setActiveReport(null)} />;
      case "project": return <ProjectReport onBack={() => setActiveReport(null)} />;
      case "payroll": return <PayrollReport onBack={() => setActiveReport(null)} />;
      default: return null;
    }
  };

  if (activeReport) {
    return renderReport();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
        <p className="text-slate-500">Select a report type to filter, preview and download data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_TYPES.map((rt) => (
          <Card
            key={rt.id}
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setActiveReport(rt.id)}
          >
            <CardContent className="p-6 flex flex-col gap-4">
              <div className={`w-12 h-12 rounded-xl ${rt.bg} flex items-center justify-center`}>
                <rt.icon className={`w-6 h-6 ${rt.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{rt.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{rt.description}</p>
              </div>
              <Button variant="outline" className="w-full mt-auto" onClick={() => setActiveReport(rt.id)}>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
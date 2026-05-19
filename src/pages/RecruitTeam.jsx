import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ROLE_CATEGORIES = {
  admin: "Admins",
  hr: "HR Members",
  manager: "Senior HR Managers",
  intern: "Intern Recruiters",
};

export default function RecruitTeamPage() {
  const { toast } = useToast();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-team"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => base44.entities.Candidate.list(),
    staleTime: 2 * 60 * 1000,
  });

  const teamMembers = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return employees
      .filter(e => ["hr","manager","admin"].includes(e.role))
      .map(emp => {
        const assigned = candidates.filter(c => c.assigned_to === emp.email);
        const contacted = assigned.filter(c => c.pipeline_status !== "Sourced").length;
        const driveReady = assigned.filter(c => c.pipeline_status === "Drive Ready").length;
        const conv = assigned.length > 0 ? Math.round((driveReady / assigned.length) * 100) : 0;
        const contactedToday = assigned.filter(c => {
          const log = c.activity_log || [];
          return log.some(l => l.timestamp?.startsWith(today) && l.to_status && l.to_status !== "Sourced");
        }).length;
        return { ...emp, assigned: assigned.length, contacted, driveReady, conv, contactedToday };
      });
  }, [employees, candidates]);

  const grouped = useMemo(() => {
    const g = { admin: [], manager: [], hr: [], intern: [] };
    teamMembers.forEach(m => {
      if (g[m.role]) g[m.role].push(m);
    });
    return g;
  }, [teamMembers]);

  const stats = {
    total: teamMembers.length,
    admins: grouped.admin.length,
    seniorHR: grouped.manager.length,
    hr: grouped.hr.length,
    interns: grouped.intern.length,
  };

  const MemberRow = ({ m }) => (
    <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {m.full_name?.[0] || "?"}
          </div>
          <div>
            <div className="font-medium text-slate-800 text-sm">{m.full_name}</div>
            <div className="text-xs text-slate-400">{m.designation || m.role}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-slate-500">{m.email}</td>
      <td className="py-3 px-4 text-center"><span className="font-medium text-slate-800">{m.assigned}</span></td>
      <td className="py-3 px-4 text-center"><span className="font-medium text-slate-700">{m.contactedToday}</span></td>
      <td className="py-3 px-4 text-center"><span className="font-medium text-indigo-700">{m.driveReady}</span></td>
      <td className="py-3 px-4 text-center">
        <Badge className={`border-0 text-xs ${m.conv >= 20 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{m.conv}%</Badge>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" style={{ width: `${Math.min(100, m.conv)}%` }} />
          </div>
          <span className="text-xs text-slate-400 w-8">{m.conv}%</span>
        </div>
      </td>
    </tr>
  );

  const MemberTable = ({ members, title }) => {
    if (members.length === 0) return null;
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Name","Email","Assigned","Contacted Today","Drive Ready","Conversion %","Progress"].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-xs font-medium text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => <MemberRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleInvite = async () => {
    const email = prompt("Enter email address to invite:");
    if (!email) return;
    try {
      await base44.users.inviteUser(email, "user");
      toast({ title: "Invitation sent to " + email });
    } catch {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Recruitment Team</h2>
        <Button onClick={handleInvite} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <UserPlus className="w-4 h-4" />Invite Member
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Members", value: stats.total, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Admins", value: stats.admins, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Senior HR", value: stats.seniorHR, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "HR Members", value: stats.hr, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Interns", value: stats.interns, color: "text-slate-600", bg: "bg-slate-100" },
        ].map(m => (
          <Card key={m.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                <Users className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800">{m.value}</div>
                <div className="text-xs text-slate-500">{m.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MemberTable members={grouped.manager} title="Senior HR Managers" />
      <MemberTable members={grouped.hr} title="HR Members" />
      <MemberTable members={grouped.intern} title="Intern Recruiters" />
      <MemberTable members={grouped.admin} title="Admins" />

      {teamMembers.length === 0 && (
        <div className="text-center py-16 text-slate-400">No team members found with HR/Manager/Admin roles.</div>
      )}
    </div>
  );
}
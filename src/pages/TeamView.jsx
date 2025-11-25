import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Mail, Phone, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TeamView() {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchUser();
  }, []);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team', employee?.department],
    queryFn: () => base44.entities.Employee.filter({ department: employee?.department }),
    enabled: !!employee?.department,
  });

  const filteredMembers = teamMembers.filter(member =>
    member.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    member.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Team</h2>
        <p className="text-slate-500 capitalize">{employee?.department} Department</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                {member.profile_photo ? (
                  <img src={member.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                    {member.full_name?.[0] || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-800">{member.full_name}</h3>
                  <p className="text-sm text-slate-500">{member.designation || 'Employee'}</p>
                  <Badge className={member.status === 'active' ? 'bg-green-100 text-green-700 mt-1' : 'bg-amber-100 text-amber-700 mt-1'}>
                    {member.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {member.email}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {member.phone || '-'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Joined {member.date_of_joining ? format(new Date(member.date_of_joining), 'MMM d, yyyy') : '-'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No team members found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
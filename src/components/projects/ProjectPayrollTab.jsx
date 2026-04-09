import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Download, CheckCircle, Clock, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProjectPayrollTab({ projectId, project }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['projectApplications', projectId],
    queryFn: () => base44.entities.ProjectApplication.filter({ project_id: projectId, status: 'accepted' }),
    enabled: !!projectId
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payment_status }) => base44.entities.ProjectApplication.update(id, { payment_status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectApplications', projectId]);
      toast.success('Payment status updated');
    }
  });

  const filtered = applications.filter(a =>
    a.freelancer_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.freelancer_email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(a => a.id));

  const markSelectedPaid = async () => {
    for (const id of selectedIds) {
      await base44.entities.ProjectApplication.update(id, { payment_status: 'paid' });
    }
    queryClient.invalidateQueries(['projectApplications', projectId]);
    toast.success(`${selectedIds.length} payment(s) marked as paid`);
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const rows = filtered.map(a => [
      a.freelancer_name || '',
      a.freelancer_email || '',
      a.freelancer_phone || '',
      project?.payout || 0,
      a.payment_status || 'pending',
      a.created_date ? format(new Date(a.created_date), 'yyyy-MM-dd') : ''
    ]);
    const headers = ['Name', 'Email', 'Phone', 'Payout (₹)', 'Payment Status', 'Applied Date'];
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${project?.name || projectId}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPayout = project?.payout || 0;
  const paidCount = applications.filter(a => a.payment_status === 'paid').length;
  const pendingCount = applications.length - paidCount;
  const totalAmount = applications.length * totalPayout;
  const paidAmount = paidCount * totalPayout;

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading payroll...</div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Total Freelancers</p>
            <p className="text-2xl font-bold text-slate-800">{applications.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Total Payout</p>
            <p className="text-2xl font-bold text-indigo-600">₹{totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{paidCount} freelancers</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">₹{((pendingCount) * totalPayout).toLocaleString()}</p>
            <p className="text-xs text-slate-400">{pendingCount} freelancers</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-base">Accepted Freelancers — Payout: ₹{totalPayout?.toLocaleString()} each</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
              </div>
              {selectedIds.length > 0 && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={markSelectedPaid}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Mark Paid ({selectedIds.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No accepted freelancers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Payout</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Payment Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(app => (
                    <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.includes(app.id)}
                          onCheckedChange={() => toggleSelect(app.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{app.freelancer_name}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{app.freelancer_email}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{app.freelancer_phone || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-700">₹{totalPayout?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge className={app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {app.payment_status === 'paid' ? (
                            <><CheckCircle className="w-3 h-3 mr-1 inline" />Paid</>
                          ) : (
                            <><Clock className="w-3 h-3 mr-1 inline" />Pending</>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {app.payment_status !== 'paid' ? (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-xs"
                            onClick={() => updateMutation.mutate({ id: app.id, payment_status: 'paid' })}
                          >
                            Mark Paid
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-amber-600 border-amber-300"
                            onClick={() => updateMutation.mutate({ id: app.id, payment_status: 'pending' })}
                          >
                            Mark Pending
                          </Button>
                        )}
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
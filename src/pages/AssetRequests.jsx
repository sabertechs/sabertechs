import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categories = [
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "monitor", label: "Monitor" },
  { value: "printer", label: "Printer" },
  { value: "furniture", label: "Furniture" },
  { value: "software", label: "Software" },
  { value: "networking", label: "Networking" },
  { value: "other", label: "Other" }
];

export default function AssetRequests() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    asset_category: "laptop",
    request_type: "new",
    reason: "",
    urgency: "medium"
  });

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchUser();
  }, []);

  const isHR = employee?.role === 'hr' || employee?.role === 'manager' || employee?.role === 'department_head' || user?.role === 'admin';

  const { data: requests = [] } = useQuery({
    queryKey: ['assetRequests'],
    queryFn: () => isHR 
      ? base44.entities.AssetRequest.list()
      : base44.entities.AssetRequest.filter({ requester_email: user?.email }),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AssetRequest.create({
      ...data,
      requester_email: user.email,
      requester_name: user.full_name,
      department: employee?.department
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
      setShowAddDialog(false);
      setFormData({ asset_category: "laptop", request_type: "new", reason: "", urgency: "medium" });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (status) => {
      await base44.entities.AssetRequest.update(selectedRequest.id, {
        status,
        approved_by: user.email,
        approved_date: format(new Date(), 'yyyy-MM-dd'),
        rejection_reason: status === 'rejected' ? rejectionReason : null
      });

      await base44.entities.Notification.create({
        recipient_email: selectedRequest.requester_email,
        title: `Asset Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved' 
          ? `Your request for ${selectedRequest.asset_category} has been approved.`
          : `Your request for ${selectedRequest.asset_category} was rejected. Reason: ${rejectionReason}`,
        type: status === 'approved' ? 'success' : 'alert'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    }
  });

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
      req.asset_category?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Requests</h2>
          <p className="text-slate-500">{isHR ? 'Manage all asset requests' : 'Request new assets'}</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((req) => (
          <Card key={req.id} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    req.status === 'pending' ? 'bg-amber-100' :
                    req.status === 'approved' ? 'bg-green-100' :
                    req.status === 'rejected' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    {req.status === 'pending' ? <Clock className="w-6 h-6 text-amber-600" /> :
                     req.status === 'approved' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                     <XCircle className="w-6 h-6 text-red-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 capitalize">{req.asset_category}</h3>
                      <Badge variant="outline" className="capitalize">{req.request_type}</Badge>
                      <Badge className={
                        req.urgency === 'high' ? 'bg-red-100 text-red-700' :
                        req.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }>
                        {req.urgency} priority
                      </Badge>
                    </div>
                    {isHR && <p className="text-sm text-slate-500 mt-1">{req.requester_name} • {req.department}</p>}
                    <p className="text-slate-600 mt-2">{req.reason}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Requested on {format(new Date(req.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {req.status}
                  </Badge>
                  {isHR && req.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => { setSelectedRequest(req); setShowApproveDialog(true); }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
              {req.status === 'rejected' && req.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600"><strong>Rejection Reason:</strong> {req.rejection_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredRequests.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No requests found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Asset Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Asset Category *</Label>
              <Select value={formData.asset_category} onValueChange={(v) => setFormData(p => ({ ...p, asset_category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={formData.request_type} onValueChange={(v) => setFormData(p => ({ ...p, request_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Asset</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={formData.urgency} onValueChange={(v) => setFormData(p => ({ ...p, urgency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
                placeholder="Explain why you need this asset..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.reason || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold capitalize">{selectedRequest.asset_category}</p>
                <p className="text-sm text-slate-500">By {selectedRequest.requester_name}</p>
                <p className="text-slate-600 mt-2">{selectedRequest.reason}</p>
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => approveMutation.mutate('rejected')}
              disabled={!rejectionReason || approveMutation.isPending}
            >
              Reject
            </Button>
            <Button
              onClick={() => approveMutation.mutate('approved')}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
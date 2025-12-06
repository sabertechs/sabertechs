import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function APIModule() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [formData, setFormData] = useState({
    employee_email: "",
    employee_name: "",
    verification_type: "",
    request_data: {},
    notes: ""
  });

  const { data: verifications = [] } = useQuery({
    queryKey: ['apiVerifications'],
    queryFn: () => base44.entities.APIVerification.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.APIVerification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiVerifications'] });
      setShowAddDialog(false);
      resetForm();
      toast.success('Verification request created');
    },
    onError: () => toast.error('Failed to create request')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.APIVerification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiVerifications'] });
      setShowViewDialog(false);
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update')
  });

  const resetForm = () => {
    setFormData({
      employee_email: "",
      employee_name: "",
      verification_type: "",
      request_data: {},
      notes: ""
    });
  };

  const handleCreate = () => {
    if (!formData.employee_email || !formData.verification_type) {
      toast.error('Please fill required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleStatusUpdate = (status) => {
    if (!selectedVerification) return;
    updateMutation.mutate({
      id: selectedVerification.id,
      data: { status }
    });
  };

  const filteredVerifications = verifications.filter(v =>
    v.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.employee_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.verification_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">API Verification Module</h2>
          <p className="text-slate-600">Manual verification requests</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>Manage API verification requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVerifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500">
                    No verification requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{verification.employee_name}</p>
                        <p className="text-sm text-slate-500">{verification.employee_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{verification.verification_type}</TableCell>
                    <TableCell>{getStatusBadge(verification.status)}</TableCell>
                    <TableCell>
                      {new Date(verification.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVerification(verification);
                          setShowViewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Verification Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Email *</Label>
                <Input
                  value={formData.employee_email}
                  onChange={(e) => setFormData({ ...formData, employee_email: e.target.value })}
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Name *</Label>
                <Input
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Verification Type *</Label>
              <Input
                value={formData.verification_type}
                onChange={(e) => setFormData({ ...formData, verification_type: e.target.value })}
                placeholder="e.g., background_check, document_verify"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-600">Employee</Label>
                  <p className="font-medium">{selectedVerification.employee_name}</p>
                  <p className="text-sm text-slate-500">{selectedVerification.employee_email}</p>
                </div>
                <div>
                  <Label className="text-slate-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedVerification.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-slate-600">Verification Type</Label>
                <p className="font-medium capitalize">{selectedVerification.verification_type}</p>
              </div>
              {selectedVerification.notes && (
                <div>
                  <Label className="text-slate-600">Notes</Label>
                  <p className="text-sm">{selectedVerification.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleStatusUpdate('processing')}
                  disabled={selectedVerification.status === 'processing'}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Set Processing
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-green-600 hover:text-green-700"
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={selectedVerification.status === 'completed'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                  onClick={() => handleStatusUpdate('failed')}
                  disabled={selectedVerification.status === 'failed'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark Failed
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssetAssignDialog({ asset, open, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignmentDate, setAssignmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' }),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Update asset
      await base44.entities.Asset.update(asset.id, {
        status: 'assigned',
        assigned_to_email: selectedEmployee.email,
        assigned_to_name: selectedEmployee.full_name,
        assigned_date: assignmentDate
      });
      
      // Create assignment record
      await base44.entities.AssetAssignment.create({
        asset_id: asset.id,
        asset_name: asset.name,
        employee_email: selectedEmployee.email,
        employee_name: selectedEmployee.full_name,
        department: selectedEmployee.department,
        assignment_date: assignmentDate,
        action: 'assigned',
        notes
      });

      // Create notification
      await base44.entities.Notification.create({
        recipient_email: selectedEmployee.email,
        title: 'Asset Assigned',
        message: `You have been assigned: ${asset.name} (${asset.asset_id})`,
        type: 'info'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onClose();
    }
  });

  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Assign Asset
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="font-medium text-slate-800">{asset.name}</p>
            <p className="text-sm text-slate-500">{asset.asset_id}</p>
          </div>

          <div className="space-y-2">
            <Label>Select Employee *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded-lg">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 border-b last:border-0 ${
                    selectedEmployee?.id === emp.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <p className="font-medium text-sm">{emp.full_name}</p>
                  <p className="text-xs text-slate-500">{emp.email}</p>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">No employees found</p>
              )}
            </div>
          </div>

          {selectedEmployee && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Selected: <strong>{selectedEmployee.full_name}</strong>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assignment Date</Label>
            <Input
              type="date"
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedEmployee || assignMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Asset'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
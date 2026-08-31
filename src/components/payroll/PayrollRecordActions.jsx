import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

export default function PayrollRecordActions({ record, onUpdated, onDeleted }) {
  const { can } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: record.date || '',
    proctor_name: record.proctor_name || '',
    mobile_number: record.mobile_number || '',
    client_name: record.client_name || '',
    drive_timing: record.drive_timing || '',
    role: record.role || '',
    payment: record.payment ?? '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const project_month = form.date ? form.date.substring(0, 7) : record.project_month;
      const res = await base44.functions.invoke('manageFreelancerPayrollRecord', {
        action: 'update',
        id: record.id,
        data: {
          ...form,
          payment: form.payment === '' ? 0 : Number(form.payment),
          project_month,
        },
      });
      if (res.data?.error) throw new Error(res.data.error);
      onUpdated?.({ ...record, ...form, payment: Number(form.payment) || 0, project_month });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const res = await base44.functions.invoke('manageFreelancerPayrollRecord', {
      action: 'delete',
      id: record.id,
    });
    if (res.data?.error) throw new Error(res.data.error);
    onDeleted?.(record.id);
    setDeleteOpen(false);
  };

  if (!can('payroll.freelancer.records')) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {can('payroll.freelancer.records') && (
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4 text-slate-500" />
        </Button>
      )}
      {can('payroll.freelancer.records') && (
        <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Date (YYYY-MM-DD)</Label>
              <Input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Proctor Name</Label>
              <Input value={form.proctor_name} onChange={e => setForm(f => ({ ...f, proctor_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input value={form.mobile_number} onChange={e => setForm(f => ({ ...f, mobile_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Client Name</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Drive Timing</Label>
              <Input value={form.drive_timing} onChange={e => setForm(f => ({ ...f, drive_timing: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment</Label>
              <Input type="number" value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payroll record for {record.proctor_name} on {record.date}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
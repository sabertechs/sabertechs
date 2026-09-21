import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { History, FileSpreadsheet, Trash2, Download, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchAllRecords } from "@/lib/paginatedFetch";

export default function PayrollUploadHistory() {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(u => setIsAdmin(u?.data?.designation?.toLowerCase() === 'admin'))
      .catch(() => {});
  }, []);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['payrollUploadHistory'],
    queryFn: () => fetchAllRecords(base44.entities.UploadHistory, { upload_type: 'payroll' }, '-upload_timestamp'),
    staleTime: 30 * 1000,
  });

  const formatDate = (ts) => {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    } catch { return "-"; }
  };

  const formatTime = (ts) => {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    } catch { return "-"; }
  };

  const handleDownload = async (h) => {
    try {
      setDownloadingId(h.id);
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: h.file_uri });
      const a = document.createElement('a');
      a.href = res.signed_url;
      a.download = h.file_name || 'payroll_upload.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error('Download failed: ' + (e.message || 'Unknown error'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteProgress(5);
    try {
      // 1. Fetch all payroll record IDs for this batch
      const records = await fetchAllRecords(base44.entities.FreelancerPayroll, { upload_batch: confirmDelete.batch_id });
      const total = records.length;
      setDeleteProgress(15);

      // 2. Delete in chunks of 500 (deleteMany caps large batches)
      if (total > 0) {
        const CHUNK = 500;
        for (let i = 0; i < total; i += CHUNK) {
          const ids = records.slice(i, i + CHUNK).map(r => r.id);
          await base44.entities.FreelancerPayroll.deleteMany({ id: { $in: ids } });
          setDeleteProgress(15 + Math.min(75, Math.round(((i + CHUNK) / total) * 75)));
        }
      }

      // 3. Delete the UploadHistory record itself
      await base44.entities.UploadHistory.delete(confirmDelete.id);
      setDeleteProgress(100);

      queryClient.invalidateQueries(['payrollUploadHistory']);
      queryClient.invalidateQueries(['freelancerPayrollAll']);
      toast.success(`Deleted ${records.length} payroll records and upload history entry`);
    } catch (e) {
      toast.error('Delete failed: ' + (e.message || 'Unknown error'));
    } finally {
      setDeleting(false);
      setDeleteProgress(0);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-purple-600" /> Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading history...
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No uploads yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                    <th className="py-2 px-3 font-medium">File Name</th>
                    <th className="py-2 px-3 font-medium">Uploaded By</th>
                    <th className="py-2 px-3 font-medium">Date &amp; Time</th>
                    <th className="py-2 px-3 font-medium text-center">Records</th>
                    <th className="py-2 px-3 font-medium text-center">Status</th>
                    <th className="py-2 px-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="font-medium text-slate-700 truncate max-w-[220px]" title={h.file_name}>{h.file_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-slate-700">{h.uploaded_by_name || "—"}</span>
                          <span className="text-xs text-slate-400">{h.uploaded_by_email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formatDate(h.upload_timestamp)}</span>
                          <span className="text-xs text-slate-400">{formatTime(h.upload_timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-slate-700 font-medium">{h.success_count ?? 0}</span>
                        <span className="text-xs text-slate-400 block">of {h.total_records ?? 0}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />{h.success_count ?? 0}
                          </Badge>
                          {(h.skipped_count ?? 0) > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <AlertCircle className="w-3 h-3 mr-1" />{h.skipped_count}
                            </Badge>
                          )}
                          {(h.failed_count ?? 0) > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" />{h.failed_count}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {h.file_uri && (
                            <button
                              onClick={() => handleDownload(h)}
                              disabled={downloadingId === h.id}
                              className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 disabled:opacity-50"
                              title="Download original file"
                            >
                              {downloadingId === h.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmDelete(h)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                              title="Delete file and all associated records"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={() => { if (!deleting) setConfirmDelete(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Upload
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{confirmDelete?.file_name}</strong>?
              <br />This will permanently delete <strong>{confirmDelete?.success_count ?? 0} payroll records</strong> associated with this upload.
              <br /><span className="text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="space-y-2 py-2">
              <Progress value={deleteProgress} className="h-2" />
              <p className="text-xs text-slate-500 text-center">Deleting… {deleteProgress}%</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
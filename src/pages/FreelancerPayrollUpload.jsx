import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Upload, Trash2, FileSpreadsheet, Users, Download, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";

function downloadSample() {
  const SAMPLE_ROWS = [
    {
      'Date': new Date(2026, 3, 1),
      'Proctor Name': 'Pooja Goel',
      'Mobile Number': '8700159920',
      'Email ID': 'bpooja298@gmail.com',
      'Client Name': 'Insead',
      'Drive timing': 'General',
      'Role': 'Proctor',
      'Payment': 300,
    },
  ];

  // Use plain string date in YYYY-MM-DD format — avoids any timezone/Excel serial number issues
  const SAMPLE_ROWS_SAFE = SAMPLE_ROWS.map(r => ({
    ...r,
    'Date': '2026-04-01',
  }));

  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS_SAFE);
  ws['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'payroll_sample_template.xlsx');
}

function downloadErrorReport(skippedRows) {
  const reportRows = skippedRows.map(s => ({
    'Row #': s.row,
    'Email': s.email,
    'Reason for Skip': s.reason,
  }));
  const ws = XLSX.utils.json_to_sheet(reportRows);
  ws['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Skipped Rows');
  XLSX.writeFile(wb, 'payroll_upload_error_report.xlsx');
}

// Safely format a date as YYYY-MM-DD WITHOUT using toISOString()
// toISOString() converts to UTC which can shift date back 1 day for IST (UTC+5:30)
const toLocalDateString = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseExcelDate = (val) => {
  if (!val && val !== 0) return '';

  // If XLSX gave us a real JS Date object (when cellDates:true is used)
  if (val instanceof Date) {
    if (isNaN(val)) return '';
    return toLocalDateString(val);
  }

  const num = Number(val);
  // Excel serial number — reconstruct using local date parts to avoid UTC shift
  if (!isNaN(num) && num > 1000) {
    const excelEpoch = new Date(1899, 11, 30); // Dec 30 1899 in local time
    const ms = excelEpoch.getTime() + num * 86400000;
    const d = new Date(ms);
    return toLocalDateString(d);
  }

  const str = val.toString().trim();

  // dd-mmm-yy  e.g. "01-Apr-26"
  const dMonYMatch = str.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/);
  if (dMonYMatch) {
    let [, day, mon, yr] = dMonYMatch;
    if (yr.length === 2) yr = '20' + yr;
    const dt = new Date(`${day} ${mon} ${yr}`);
    if (!isNaN(dt)) return toLocalDateString(dt);
  }

  // dd-mm-yy or dd/mm/yy
  const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (dmyMatch) {
    let [, d, m, y] = dmyMatch;
    if (y.length === 2) y = '20' + y;
    // Build as local date (NOT via ISO string which assumes UTC)
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dt)) return toLocalDateString(dt);
  }

  // yyyy-mm-dd (already ISO-like — parse parts directly)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(dt)) return toLocalDateString(dt);
  }

  return '';
};

export default function FreelancerPayrollUpload() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [file, setFile] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null); // batch object to confirm
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const { data: records = [] } = useQuery({
    queryKey: ['freelancerPayrollAll'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPayrollRecords', {});
      return res.data?.records || [];
    },
    staleTime: 30 * 1000,
  });

  // Group by batch
  const batches = records.reduce((acc, r) => {
    const key = r.upload_batch || 'unknown';
    if (!acc[key]) acc[key] = { batch: key, month: r.project_month, count: 0, freelancers: new Set(), created: r.created_date };
    acc[key].count++;
    acc[key].freelancers.add(r.proctor_email);
    return acc;
  }, {});
  const batchList = Object.values(batches).sort((a, b) => new Date(b.created) - new Date(a.created));

  const parseFileToRows = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    setProgress(5);
    setUploadResult(null);
    setUploadError(null);

    try {
      const rows = await parseFileToRows(file);
      if (!rows || rows.length === 0) {
        setUploadError('The uploaded file has no data rows.');
        return;
      }

      setProgress(15);

      const batchId = `batch_${Date.now()}`;
      const validRecords = [];
      const skippedRows = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const errors = [];

        const email = (row['Email ID'] || '').toString().trim().toLowerCase();
        if (!email) errors.push('Missing Email ID');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: "${email}"`);

        const rawDate = row['Date'] || '';
        const date = parseExcelDate(rawDate);
        if (!date) errors.push(`Missing or invalid Date: "${rawDate}"`);

        const proctorName = (row['Proctor Name'] || '').toString().trim();
        const mobileNumber = (row['Mobile Number'] || '').toString().trim();
        const clientName = (row['Client Name'] || '').toString().trim();
        const driveTiming = (row['Drive timing'] || row['Drive Timing'] || 'General').toString().trim();
        const role = (row['Role'] || '').toString().trim();

        const rawPayment = row['Payment'] || '';
        const payment = rawPayment !== '' ? parseFloat(rawPayment) : NaN;
        if (isNaN(payment)) errors.push(`Missing or invalid Payment: "${rawPayment}"`);

        if (errors.length > 0) {
          skippedRows.push({ row: rowNum, email: email || '-', reason: errors.join('; ') });
          continue;
        }

        validRecords.push({
          date,
          proctor_name: proctorName,
          mobile_number: mobileNumber,
          proctor_email: email,
          client_name: clientName,
          drive_timing: driveTiming,
          role,
          payment,
          project_month: date.substring(0, 7),
          upload_batch: batchId,
        });
      }

      const CHUNK_SIZE = 100;
      let inserted = 0;
      const insertErrors = [];
      const totalChunks = Math.ceil(validRecords.length / CHUNK_SIZE);

      for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
        const chunk = validRecords.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        setProgress(15 + Math.round((chunkIndex / totalChunks) * 80));

        try {
          const res = await base44.functions.invoke('uploadPayrollChunk', { records: chunk });
          inserted += res.data?.inserted || 0;
        } catch (e) {
          insertErrors.push(`Rows ${i + 2}-${i + chunk.length + 1}: ${e.message}`);
        }
      }

      setProgress(100);
      setUploadResult({
        success: true,
        inserted,
        skipped: skippedRows,
        errors: insertErrors,
        total_rows: rows.length,
      });

      if (inserted > 0) {
        toast.success(`Uploaded ${inserted} of ${rows.length} records successfully`);
        setFile(null);
        queryClient.invalidateQueries(['freelancerPayrollAll']);
      }
    } catch (err) {
      setUploadError(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteBatch) return;
    const batchId = confirmDeleteBatch.batch;
    setDeleting(true);
    setDeleteProgress(5);
    try {
      // Fetch all records for this batch directly from entity to ensure we have IDs
      const toDelete = await base44.entities.FreelancerPayroll.filter({ upload_batch: batchId });
      if (toDelete.length === 0) {
        toast.error('No records found for this batch');
        return;
      }
      let deleted = 0;
      for (let i = 0; i < toDelete.length; i++) {
        await base44.entities.FreelancerPayroll.delete(toDelete[i].id);
        deleted++;
        setDeleteProgress(Math.round((deleted / toDelete.length) * 100));
      }
      queryClient.invalidateQueries(['freelancerPayrollAll']);
      toast.success(`Deleted ${deleted} records from batch`);
    } catch (e) {
      toast.error('Delete failed: ' + e.message);
    } finally {
      setDeleting(false);
      setDeleteProgress(0);
      setConfirmDeleteBatch(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Freelancer Payroll Upload</h1>
        <p className="text-slate-500 mt-1">Upload XLSX payroll reports. Skipped rows will be available as a downloadable error report.</p>
        <Button variant="outline" size="sm" onClick={downloadSample} className="mt-2 border-green-400 text-green-700 hover:bg-green-50">
          <Download className="w-4 h-4 mr-2" /> Download Sample Template
        </Button>
      </div>

      {/* Upload Card */}
      <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <FileSpreadsheet className="w-12 h-12 text-indigo-400" />
            <div className="text-center">
              <p className="font-medium text-slate-700">Upload Payroll Report (XLSX)</p>
              <p className="text-sm text-slate-500">
                Required columns: <span className="font-semibold text-indigo-700">Date, Proctor Name, Mobile Number, Email ID, Client Name, Drive timing, Role, Payment</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => { setFile(e.target.files[0]); setUploadResult(null); setUploadError(null); }}
                className="block text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer"
              />
              <Button onClick={handleUpload} disabled={!file || uploading} className="bg-indigo-600 hover:bg-indigo-700">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {uploading && (
              <div className="w-full max-w-md space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-slate-500 text-center">Processing file, please wait…</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Error */}
      {uploadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Upload Failed</p>
                <p className="text-sm text-red-600 mt-1">{uploadError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Result */}
      {uploadResult && !uploading && (
        <Card className={uploadResult.inserted > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-slate-800">Upload Report</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-green-700 font-medium">✅ Inserted: {uploadResult.inserted}</span>
              <span className="text-slate-500">📋 Total rows: {uploadResult.total_rows}</span>
              {uploadResult.skipped?.length > 0 && (
                <span className="text-yellow-700 font-medium">⚠️ Skipped: {uploadResult.skipped.length}</span>
              )}
              {uploadResult.errors?.length > 0 && (
                <span className="text-red-700 font-medium">❌ Errors: {uploadResult.errors.length}</span>
              )}
            </div>

            {uploadResult.skipped?.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Skipped Rows ({uploadResult.skipped.length})
                  </p>
                  <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-50 h-7 text-xs" onClick={() => downloadErrorReport(uploadResult.skipped)}>
                    <Download className="w-3 h-3 mr-1" /> Download Error Report
                  </Button>
                </div>
                <div className="bg-white rounded border border-yellow-200 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-yellow-800">Row #</th>
                        <th className="px-3 py-1.5 text-left text-yellow-800">Email</th>
                        <th className="px-3 py-1.5 text-left text-yellow-800">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.skipped.map((s, i) => (
                        <tr key={i} className="border-t border-yellow-100">
                          <td className="px-3 py-1 text-slate-600">{s.row}</td>
                          <td className="px-3 py-1 text-slate-600">{s.email}</td>
                          <td className="px-3 py-1 text-red-600">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {batchList.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No uploads yet</p>
          ) : (
            <div className="space-y-3">
              {batchList.map((b) => (
                <div key={b.batch} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-slate-800">{b.batch}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {b.month && <Badge variant="outline">{b.month}</Badge>}
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {b.freelancers.size} freelancers · {b.count} records
                        </span>
                        <span className="text-xs text-slate-400">
                          {b.created ? format(new Date(b.created), 'dd MMM yyyy, h:mm a') : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => setConfirmDeleteBatch(b)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteBatch} onOpenChange={() => { if (!deleting) setConfirmDeleteBatch(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Batch
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all <strong>{confirmDeleteBatch?.count} records</strong> from batch <strong>{confirmDeleteBatch?.batch}</strong>?
              {confirmDeleteBatch?.month && <> (Month: <strong>{confirmDeleteBatch.month}</strong>)</>}
              <br /><span className="text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          {deleting && (
            <div className="space-y-2 py-2">
              <Progress value={deleteProgress} className="h-2" />
              <p className="text-xs text-slate-500 text-center">Deleting records… {deleteProgress}%</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteBatch(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
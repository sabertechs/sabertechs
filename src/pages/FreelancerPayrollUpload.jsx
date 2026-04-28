import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2, FileSpreadsheet, Users, Download, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";

function downloadSample() {
  const SAMPLE_ROWS = [
    { 'Proctor Email': 'john.doe@gmail.com', 'Client Name': 'Sample Client Ltd', 'Role': 'Proctor', 'Drive Date': new Date(2026, 3, 4), 'Drive Hours': '06:00:00', 'Amount': 500 },
    { 'Proctor Email': 'jane.smith@gmail.com', 'Client Name': 'Sample Client Ltd', 'Role': 'Proctor', 'Drive Date': new Date(2026, 3, 5), 'Drive Hours': '06:00:00', 'Amount': 500 },
  ];

  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { cellDates: true });

  // Format Drive Date column (D) as dd-mm-yy
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const cellAddr = `D${R + 1}`;
    if (ws[cellAddr] && ws[cellAddr].t === 'd') {
      ws[cellAddr].z = 'dd-mm-yy';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'payroll_sample_template.xlsx', { cellDates: true });
}

function downloadErrorReport(skippedRows) {
  const reportRows = skippedRows.map(s => ({
    'Row #': s.row,
    'Proctor Email': s.email,
    'Reason for Skip': s.reason,
  }));
  const ws = XLSX.utils.json_to_sheet(reportRows);
  ws['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Skipped Rows');
  XLSX.writeFile(wb, 'payroll_upload_error_report.xlsx');
}

export default function FreelancerPayrollUpload() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null); // { inserted, skipped, errors, total_rows }
  const [uploadError, setUploadError] = useState(null);
  const [file, setFile] = useState(null);

  const { data: records = [] } = useQuery({
    queryKey: ['freelancerPayrollAll'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPayrollRecords', {});
      return res.data?.records || [];
    },
    refetchInterval: 3000, // refresh every 3s so history appears after upload
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

  const parseFileToRecords = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseExcelDate = (val) => {
    if (!val && val !== 0) return '';
    const num = Number(val);
    if (!isNaN(num) && num > 1000) {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + num * 86400000);
      return d.toISOString().split('T')[0];
    }
    const str = val.toString().trim();
    const dmyMatch = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
    if (dmyMatch) {
      let [, d, m, y] = dmyMatch;
      if (y.length === 2) y = '20' + y;
      const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    }
    const dt = new Date(str);
    if (!isNaN(dt)) return dt.toISOString().split('T')[0];
    return '';
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    setProgress(5);
    setUploadResult(null);
    setUploadError(null);

    try {
      // Parse file on frontend
      const rows = await parseFileToRecords(file);
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

        const email = (row['Proctor Email'] || '').toString().trim().toLowerCase();
        if (!email) errors.push('Missing Proctor Email');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Invalid email: "${email}"`);

        const clientName = (row['Client Name'] || row['Client'] || '').toString().trim();
        if (!clientName) errors.push('Missing Client Name');

        const role = (row['Role'] || '').toString().trim();
        if (!role) errors.push('Missing Role');

        const rawDriveDate = row['Drive Date'] || row['Drive Start Date'] || '';
        const driveDate = parseExcelDate(rawDriveDate);
        if (!driveDate) errors.push(`Missing or invalid Drive Date: "${rawDriveDate}"`);

        const driveHours = (row['Drive Hours'] || row['Driver hours'] || row['Driver Hours'] || '').toString().trim();
        if (!driveHours) errors.push('Missing Drive Hours');

        const rawAmount = row['Amount'] || row['Total Amount'] || '';
        const amount = rawAmount !== '' ? parseFloat(rawAmount) : NaN;
        if (isNaN(amount)) errors.push(`Missing or invalid Amount: "${rawAmount}"`);

        if (errors.length > 0) {
          skippedRows.push({ row: rowNum, email: email || '-', reason: errors.join('; ') });
          continue;
        }

        validRecords.push({
          proctor_email: email,
          client_name: clientName,
          role,
          drive_start_date: driveDate,
          driver_hours: driveHours,
          total_amount: amount,
          project_month: driveDate.substring(0, 7),
          upload_batch: batchId,
        });
      }

      // Send records in chunks of 100 to the backend
      const CHUNK_SIZE = 100;
      let inserted = 0;
      const insertErrors = [];
      const totalChunks = Math.ceil(validRecords.length / CHUNK_SIZE);

      for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
        const chunk = validRecords.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        const progressPct = 15 + Math.round((chunkIndex / totalChunks) * 80);
        setProgress(progressPct);

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

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId) => {
      const toDelete = records.filter(r => r.upload_batch === batchId);
      await Promise.all(toDelete.map(r => base44.entities.FreelancerPayroll.delete(r.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['freelancerPayrollAll']);
      toast.success('Batch deleted');
    }
  });

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
              <p className="text-sm text-slate-500">Required columns: <span className="font-semibold text-indigo-700">Proctor Email, Client Name, Role, Drive Date, Drive Hours, Amount</span></p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => { setFile(e.target.files[0]); setUploadResult(null); setUploadError(null); }}
                className="block text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {/* Progress Bar */}
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

      {/* Upload Result Report */}
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
                <span className="text-red-700 font-medium">❌ Chunk errors: {uploadResult.errors.length}</span>
              )}
            </div>

            {/* Skipped rows */}
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

            {/* Chunk errors */}
            {uploadResult.errors?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-800 mb-1">❌ Insert Errors</p>
                <div className="bg-white rounded border border-red-200 p-2 text-xs text-red-600 max-h-32 overflow-y-auto space-y-1">
                  {uploadResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Batches */}
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
                    onClick={() => deleteBatchMutation.mutate(b.batch)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
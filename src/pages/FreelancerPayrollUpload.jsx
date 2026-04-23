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

const SAMPLE_ROWS = [
  { 'S. No': 1, 'Proctor Name': 'John Doe', 'Proctor Email': 'john.doe@gmail.com', 'Drive ID': 702982, 'Account ID': 'client.account@example.com', 'Client ID': 375199, 'Client': 'Sample Client Ltd', 'Role': 'Proctor', 'Drive Start Date': '2025-01-02', 'Start Time': '09:00:00', 'Drive End Date': '2025-01-02', 'End Time': '15:00:00', 'Driver hours': '06:00:00', 'Amount': 500 },
  { 'S. No': 2, 'Proctor Name': 'Jane Smith', 'Proctor Email': 'jane.smith@gmail.com', 'Drive ID': 702983, 'Account ID': 'client.account@example.com', 'Client ID': 375199, 'Client': 'Sample Client Ltd', 'Role': 'Proctor', 'Drive Start Date': '2025-01-05', 'Start Time': '10:00:00', 'Drive End Date': '2025-01-05', 'End Time': '16:00:00', 'Driver hours': '06:00:00', 'Amount': 500 },
];

function downloadSample() {
  const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'payroll_sample_template.xlsx');
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

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    setProgress(10);
    setUploadResult(null);
    setUploadError(null);

    try {
      // Simulate progress while waiting
      const progressTimer = setInterval(() => {
        setProgress(p => p < 80 ? p + 5 : p);
      }, 600);

      // Read file as base64 and send as JSON payload
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      const res = await base44.functions.invoke('uploadFreelancerPayroll', {
        file_base64: base64,
        file_name: file.name
      });

      clearInterval(progressTimer);
      setProgress(100);

      if (res.data?.success) {
        setUploadResult(res.data);
        toast.success(`Uploaded ${res.data.inserted} of ${res.data.total_rows} records successfully`);
        setFile(null);
        queryClient.invalidateQueries(['freelancerPayrollAll']);
      } else {
        setUploadError(res.data?.error || 'Upload failed');
        if (res.data?.skipped?.length) setUploadResult(res.data);
      }
    } catch (err) {
      setUploadError(`Network or server error: ${err.message}`);
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
        <p className="text-slate-500 mt-1">Upload XLSX payroll reports. Freelancers will only see their own records.</p>
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
              <p className="text-sm text-slate-500">Columns: Proctor Name, Proctor Email, Drive ID, Account ID, Client ID, Client, Role, Drive Start/End Date, Start/End Time, Driver hours, Amount</p>
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
                <p className="text-sm font-medium text-yellow-800 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Skipped Rows
                </p>
                <div className="bg-white rounded border border-yellow-200 max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-yellow-800">Row #</th>
                        <th className="px-3 py-1.5 text-left text-yellow-800">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.skipped.map((s, i) => (
                        <tr key={i} className="border-t border-yellow-100">
                          <td className="px-3 py-1 text-slate-600">{s.row}</td>
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
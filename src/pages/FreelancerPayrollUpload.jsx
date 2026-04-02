import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, FileSpreadsheet, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FreelancerPayrollUpload() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const { data: records = [] } = useQuery({
    queryKey: ['freelancerPayrollAll'],
    queryFn: () => base44.entities.FreelancerPayroll.list('-created_date', 200),
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
    const fd = new FormData();
    fd.append('file', file);
    const res = await base44.functions.invoke('uploadFreelancerPayroll', fd);
    setUploading(false);
    if (res.data?.success) {
      toast.success(`Uploaded ${res.data.inserted} records successfully`);
      setFile(null);
      queryClient.invalidateQueries(['freelancerPayrollAll']);
    } else {
      toast.error(res.data?.error || 'Upload failed');
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
                onChange={(e) => setFile(e.target.files[0])}
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
          </div>
        </CardContent>
      </Card>

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
import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Play, Download, RefreshCw, CheckCircle, XCircle, Clock, FileSpreadsheet, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const DELAY_MS = 17000; // 17 seconds between each PAN check

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function BulkPANVerification() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const abortRef = useRef(false);

  const [batchName, setBatchName] = useState("");
  const [parsedPANs, setParsedPANs] = useState([]);
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPAN, setCurrentPAN] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [viewBatchOpen, setViewBatchOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { data: allRecords = [] } = useQuery({
    queryKey: ["bulkPANVerification"],
    queryFn: () => base44.entities.BulkPANVerification.list("-created_date", 1000),
    refetchInterval: running ? 5000 : false,
  });

  // Group records by batch_id
  const batches = React.useMemo(() => {
    const map = {};
    allRecords.forEach((r) => {
      if (!map[r.batch_id]) {
        map[r.batch_id] = {
          batch_id: r.batch_id,
          batch_name: r.batch_name,
          created_date: r.created_date,
          records: [],
        };
      }
      map[r.batch_id].records.push(r);
    });
    return Object.values(map).sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date)
    );
  }, [allRecords]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const text = evt.target.result;
      // Parse CSV/TSV or Excel-exported text - extract PAN numbers from any column
      const lines = text.split(/\r?\n/).filter(Boolean);
      const pans = [];
      lines.forEach((line) => {
        // Split by comma, tab, semicolon, or space
        const parts = line.split(/[,\t;]+/).map((p) => p.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""));
        parts.forEach((part) => {
          if (PAN_REGEX.test(part) && !pans.includes(part)) {
            pans.push(part);
          }
        });
      });
      if (pans.length === 0) {
        toast.error("No valid PAN numbers found in the file. Ensure PAN format is ABCDE1234F.");
      } else {
        setParsedPANs(pans);
        toast.success(`Found ${pans.length} valid PAN number(s)`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleXLSXUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Use XLSX via FileReader as binary
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        // Dynamically import xlsx
        const XLSX = await import("https://esm.sh/xlsx@0.18.5");
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const pans = [];
        rows.forEach((row) => {
          row.forEach((cell) => {
            const val = String(cell || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (PAN_REGEX.test(val) && !pans.includes(val)) {
              pans.push(val);
            }
          });
        });
        if (pans.length === 0) {
          toast.error("No valid PAN numbers found in the Excel file.");
        } else {
          setParsedPANs(pans);
          toast.success(`Found ${pans.length} valid PAN number(s)`);
        }
      } catch (err) {
        toast.error("Failed to parse Excel file. Try saving as CSV.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const startBatch = async () => {
    if (parsedPANs.length === 0) {
      toast.error("Please upload a file with PAN numbers first");
      return;
    }
    const name = batchName.trim() || `Batch ${new Date().toLocaleDateString("en-IN")}`;
    const batchId = `batch_${Date.now()}`;
    abortRef.current = false;
    setRunning(true);
    setProgress(0);

    // Create all records as pending first
    const createPromises = parsedPANs.map((pan) =>
      base44.entities.BulkPANVerification.create({
        pan_number: pan,
        batch_id: batchId,
        batch_name: name,
        status: "pending",
      })
    );
    const createdRecords = await Promise.all(createPromises);
    queryClient.invalidateQueries(["bulkPANVerification"]);

    // Process one by one
    for (let i = 0; i < createdRecords.length; i++) {
      if (abortRef.current) break;

      const record = createdRecords[i];
      setCurrentPAN(record.pan_number);
      setProgress(Math.round((i / createdRecords.length) * 100));

      // Mark as processing
      await base44.entities.BulkPANVerification.update(record.id, { status: "processing" });
      queryClient.invalidateQueries(["bulkPANVerification"]);

      try {
        const response = await base44.functions.invoke("verifyPANPlusV2", {
          pan_number: record.pan_number,
        });

        const res = response.data;
        if (res.success) {
          const d = res.data || {};
          await base44.entities.BulkPANVerification.update(record.id, {
            status: "success",
            full_name: d.full_name || "",
            date_of_birth: d.dob || "",
            gender: d.gender || "",
            masked_aadhaar: d.masked_aadhaar || "",
            aadhaar_linked: d.aadhaar_linked ?? false,
            category: d.category || "",
            email: d.email || "",
            phone_number: d.phone_number || "",
            address_line1: d.address?.line_1 || "",
            address_line2: d.address?.line_2 || "",
            city: d.address?.city || "",
            state: d.address?.state || "",
            zip_code: d.address?.zip || "",
            full_address: d.address?.full || "",
            verified_at: new Date().toISOString(),
          });
        } else {
          await base44.entities.BulkPANVerification.update(record.id, {
            status: "failed",
            error_message: res.error || "Verification failed",
            verified_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        await base44.entities.BulkPANVerification.update(record.id, {
          status: "failed",
          error_message: err.message || "Unknown error",
          verified_at: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries(["bulkPANVerification"]);

      // Wait with countdown before next PAN (skip wait after last)
      if (i < createdRecords.length - 1 && !abortRef.current) {
        for (let s = Math.round(DELAY_MS / 1000); s > 0; s--) {
          if (abortRef.current) break;
          setCountdown(s);
          await sleep(1000);
        }
        setCountdown(0);
      }
    }

    setRunning(false);
    setProgress(100);
    setCurrentPAN("");
    setCountdown(0);
    setParsedPANs([]);
    setBatchName("");
    setFileName("");
    toast.success("Batch verification complete!");
    queryClient.invalidateQueries(["bulkPANVerification"]);
  };

  const stopBatch = () => {
    abortRef.current = true;
    toast.info("Stopping after current PAN...");
  };

  const exportBatch = (records) => {
    const headers = ["PAN Number", "Status", "Full Name", "Date of Birth", "Gender", "Masked Aadhaar", "Aadhaar Linked", "Category", "Email", "Phone", "Address Line 1", "Address Line 2", "City", "State", "ZIP", "Full Address", "Error", "Verified At"];
    const rows = records.map((r) => [
      r.pan_number,
      r.status,
      r.full_name || "",
      r.date_of_birth || "",
      r.gender || "",
      r.masked_aadhaar || "",
      r.aadhaar_linked != null ? (r.aadhaar_linked ? "Yes" : "No") : "",
      r.category || "",
      r.email || "",
      r.phone_number || "",
      r.address_line1 || "",
      r.address_line2 || "",
      r.city || "",
      r.state || "",
      r.zip_code || "",
      r.full_address || "",
      r.error_message || "",
      r.verified_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pan_verification_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: <Badge className="bg-slate-100 text-slate-600">Pending</Badge>,
      processing: <Badge className="bg-blue-100 text-blue-700"><RefreshCw className="w-3 h-3 mr-1 animate-spin inline" />Processing</Badge>,
      success: <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1 inline" />Success</Badge>,
      failed: <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1 inline" />Failed</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const batchRecords = selectedBatch
    ? allRecords.filter((r) => r.batch_id === selectedBatch.batch_id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Bulk PAN Plus Verification</h2>
        <p className="text-slate-500 text-sm mt-1">Upload an Excel/CSV file with PAN numbers to verify them in bulk with a 15-20s gap</p>
      </div>

      {/* Upload & Run Card */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">New Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Batch Name (optional)</Label>
              <Input
                placeholder="e.g., March 2026 Verification"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                disabled={running}
              />
            </div>
            <div className="space-y-2">
              <Label>Upload Excel / CSV File</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={running}
                  className="flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {fileName || "Choose File"}
                </Button>
                {parsedPANs.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => { setParsedPANs([]); setFileName(""); }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                    handleXLSXUpload(e);
                  } else {
                    handleFileUpload(e);
                  }
                }}
              />
              {parsedPANs.length > 0 && (
                <p className="text-xs text-green-700 font-medium">{parsedPANs.length} valid PAN(s) ready</p>
              )}
            </div>
          </div>

          {parsedPANs.length > 0 && !running && (
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg max-h-28 overflow-y-auto">
              {parsedPANs.map((pan) => (
                <Badge key={pan} variant="outline" className="font-mono text-xs">{pan}</Badge>
              ))}
            </div>
          )}

          {running && (
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">
                  Verifying: <span className="font-mono">{currentPAN}</span>
                </span>
                {countdown > 0 && (
                  <span className="text-slate-500 text-xs">Next in {countdown}s</span>
                )}
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-blue-600">{progress}% complete</p>
            </div>
          )}

          <div className="flex gap-2">
            {!running ? (
              <Button
                onClick={startBatch}
                disabled={parsedPANs.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Verification
              </Button>
            ) : (
              <Button onClick={stopBatch} variant="destructive">
                Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">⚠ Each PAN is verified with a ~17 second delay to comply with API rate limits. Do not close this tab during processing.</p>
        </CardContent>
      </Card>

      {/* Batch History */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Batch History</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No batches yet. Upload a file to get started.</p>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const total = batch.records.length;
                const success = batch.records.filter((r) => r.status === "success").length;
                const failed = batch.records.filter((r) => r.status === "failed").length;
                const pending = batch.records.filter((r) => r.status === "pending" || r.status === "processing").length;
                return (
                  <div key={batch.batch_id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{batch.batch_name || batch.batch_id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(batch.created_date).toLocaleString("en-IN")} · {total} PAN(s)
                      </p>
                      <div className="flex gap-3 mt-1 text-xs">
                        <span className="text-green-600">{success} success</span>
                        <span className="text-red-500">{failed} failed</span>
                        {pending > 0 && <span className="text-blue-500">{pending} pending</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setViewBatchOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportBatch(batch.records)}
                      >
                        <Download className="w-4 h-4 mr-1" /> Export
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Batch Dialog */}
      <Dialog open={viewBatchOpen} onOpenChange={setViewBatchOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBatch?.batch_name || "Batch Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => exportBatch(batchRecords)}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">PAN</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Status</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Full Name</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">DOB</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Gender</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Masked Aadhaar</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Aadhaar Linked</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRecords.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-medium text-slate-800">{r.pan_number}</td>
                      <td className="px-3 py-2">{getStatusBadge(r.status)}</td>
                      <td className="px-3 py-2 text-slate-700">{r.full_name || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{r.date_of_birth || "—"}</td>
                      <td className="px-3 py-2 capitalize text-slate-600">{r.gender || "—"}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{r.masked_aadhaar || "—"}</td>
                      <td className="px-3 py-2">
                        {r.aadhaar_linked != null ? (
                          <Badge className={r.aadhaar_linked ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {r.aadhaar_linked ? "Yes" : "No"}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-red-500 text-xs max-w-xs truncate">{r.error_message || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
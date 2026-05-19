import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, ChevronRight, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";

const CANDIDATE_FIELDS = [
  { key: "full_name", label: "Full Name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "vertical", label: "Vertical" },
  { key: "experience_years", label: "Experience Years" },
  { key: "gender", label: "Gender" },
  { key: "source", label: "Source" },
];

const NAUKRI_DEFAULT_MAPPING = {
  "Candidate Name": "full_name",
  "Mobile": "phone",
  "Email ID": "email",
  "Current Location": "city",
  "Current Designation": "vertical",
  "Total Experience (Years)": "experience_years",
  "Gender": "gender",
};

const STEPS = ["Select Source", "Map Columns", "Handle Duplicates", "Preview", "Done"];

export default function CSVImportWizard({ open, onClose, currentUser }) {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState("Naukri");
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef();
  const qc = useQueryClient();
  const { toast } = useToast();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) return;
      const hdrs = rows[0].map(String);
      setHeaders(hdrs);
      setCsvData(rows.slice(1).map(row => Object.fromEntries(hdrs.map((h, i) => [h, row[i] ?? ""]))));
      // Auto-apply Naukri mapping
      if (source === "Naukri") {
        const autoMap = {};
        hdrs.forEach(h => { if (NAUKRI_DEFAULT_MAPPING[h]) autoMap[h] = NAUKRI_DEFAULT_MAPPING[h]; });
        setMapping(autoMap);
      }
      setStep(1);
    };
    reader.readAsBinaryString(file);
  };

  const checkDuplicates = async () => {
    const existingCandidates = await base44.entities.Candidate.list();
    const existingPhones = new Set(existingCandidates.map(c => c.phone));
    const dups = csvData.filter(row => {
      const phone = row[Object.keys(mapping).find(k => mapping[k] === "phone") || ""];
      return phone && existingPhones.has(String(phone));
    });
    setDuplicates(dups);
    setStep(2);
  };

  const doImport = async () => {
    setImporting(true);
    const phoneKey = Object.keys(mapping).find(k => mapping[k] === "phone") || "";
    const dupPhones = new Set(duplicates.map(d => String(d[phoneKey])));
    const toImport = skipDuplicates ? csvData.filter(row => !dupPhones.has(String(row[phoneKey]))) : csvData;

    let count = 0;
    for (const row of toImport) {
      const candidate = { pipeline_status: "Sourced", source };
      Object.entries(mapping).forEach(([csvCol, field]) => {
        if (row[csvCol] !== undefined && row[csvCol] !== "") candidate[field] = row[csvCol];
      });
      if (!candidate.full_name || !candidate.phone) continue;
      candidate.activity_log = [{
        timestamp: new Date().toISOString(),
        action: "Imported via CSV",
        by: currentUser?.email || "Unknown",
        from_status: null, to_status: "Sourced"
      }];
      await base44.entities.Candidate.create(candidate);
      count++;
    }
    setImportedCount(count);
    qc.invalidateQueries({ queryKey: ["candidates"] });
    qc.invalidateQueries({ queryKey: ["candidates-dash"] });
    setImporting(false);
    setStep(4);
  };

  const reset = () => {
    setStep(0); setSource("Naukri"); setCsvData([]); setHeaders([]);
    setMapping({}); setDuplicates([]); setImportedCount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Candidates from CSV</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`text-xs px-2 py-1 rounded-full font-medium ${i <= step ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{i+1}. {s}</div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Select Source + Upload */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Source Platform</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Naukri","Indeed","WhatsApp","Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div
              className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Click to upload CSV or XLSX file</p>
              <p className="text-xs text-slate-400 mt-1">Naukri mapping will be auto-applied</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {/* Step 1: Map Columns */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Map CSV columns to candidate fields. Required: Full Name, Phone.</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-48 truncate">{h}</span>
                  <span className="text-slate-300">→</span>
                  <Select value={mapping[h] || "skip"} onValueChange={v => setMapping(m => ({ ...m, [h]: v === "skip" ? undefined : v }))}>
                    <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip —</SelectItem>
                      {CANDIDATE_FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={checkDuplicates} className="bg-indigo-600 hover:bg-indigo-700 flex-1">Check Duplicates</Button>
            </div>
          </div>
        )}

        {/* Step 2: Duplicates */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{duplicates.length} duplicate(s) found (matched by phone number).</p>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} id="skipDups" />
              <label htmlFor="skipDups" className="text-sm text-slate-700">Skip duplicate records</label>
            </div>
            {duplicates.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {duplicates.slice(0,5).map((d, i) => {
                  const phoneKey = Object.keys(mapping).find(k => mapping[k] === "phone") || "";
                  const nameKey = Object.keys(mapping).find(k => mapping[k] === "full_name") || "";
                  return <div key={i} className="text-xs text-slate-600 bg-yellow-50 px-3 py-1 rounded">{d[nameKey]} — {d[phoneKey]}</div>;
                })}
                {duplicates.length > 5 && <p className="text-xs text-slate-400">+{duplicates.length - 5} more...</p>}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700 flex-1">Preview Import</Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Ready to import <strong>{skipDuplicates ? csvData.length - duplicates.length : csvData.length}</strong> candidates.</p>
            <div className="max-h-48 overflow-auto border border-slate-100 rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50">{["Name","Phone","Email","City"].map(h => <th key={h} className="px-3 py-2 text-left text-slate-500">{h}</th>)}</tr></thead>
                <tbody>
                  {csvData.slice(0,10).map((row, i) => {
                    const get = (field) => {
                      const key = Object.keys(mapping).find(k => mapping[k] === field);
                      return key ? row[key] : "";
                    };
                    return (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-3 py-1">{get("full_name")}</td>
                        <td className="px-3 py-1">{get("phone")}</td>
                        <td className="px-3 py-1">{get("email")}</td>
                        <td className="px-3 py-1">{get("city")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={doImport} disabled={importing} className="bg-indigo-600 hover:bg-indigo-700 flex-1">
                {importing ? "Importing..." : "Import Now"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-14 h-14 text-indigo-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">Import Complete!</h3>
            <p className="text-sm text-slate-600">{importedCount} candidates imported successfully.</p>
            <Button onClick={reset} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
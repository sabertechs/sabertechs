import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportShell({ title, description, onBack, onDownload, loading, rowCount, children }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rowCount !== undefined && (
            <span className="text-sm text-slate-500">{rowCount} records</span>
          )}
          <Button onClick={onDownload} disabled={loading || rowCount === 0} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>
      </div>

      {children}
    </div>
  );
}
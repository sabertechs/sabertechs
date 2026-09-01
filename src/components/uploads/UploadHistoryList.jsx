import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, FileText, User, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

/**
 * Displays the most recent freelancer upload history entries with file name,
 * uploaded-by user details, date, and time.
 */
export default function UploadHistoryList({ uploadType = "freelancer", refreshKey = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const records = await base44.entities.UploadHistory.filter(
          { upload_type: uploadType },
          "-upload_timestamp",
          10
        );
        if (!cancelled) setHistory(records);
      } catch (e) {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [uploadType, refreshKey]);

  const formatDate = (ts) => {
    if (!ts) return "-";
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    } catch { return "-"; }
  };

  const formatTime = (ts) => {
    if (!ts) return "-";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    } catch { return "-"; }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <History className="w-5 h-5 text-purple-600" />
          Recent Upload History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full mr-2"></div>
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No upload history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="py-2 px-3 font-medium">File Name</th>
                  <th className="py-2 px-3 font-medium">Uploaded By</th>
                  <th className="py-2 px-3 font-medium">Date</th>
                  <th className="py-2 px-3 font-medium">Time</th>
                  <th className="py-2 px-3 font-medium text-center">Results</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{h.file_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700">{h.uploaded_by_name || "—"}</span>
                        <span className="text-xs text-slate-400">{h.uploaded_by_email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatDate(h.upload_timestamp)}</td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{formatTime(h.upload_timestamp)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />{h.success_count ?? 0}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="w-3 h-3 mr-1" />{h.skipped_count ?? 0}
                        </Badge>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3 mr-1" />{h.failed_count ?? 0}
                        </Badge>
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
  );
}
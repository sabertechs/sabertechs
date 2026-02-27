import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, MapPin, FileText, Image as ImageIcon, Download, ExternalLink } from "lucide-react";
import { Dialog as PreviewDialog, DialogContent as PreviewDialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProjectResponsesTab({ projectId }) {
  const queryClient = useQueryClient();
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [previewResponse, setPreviewResponse] = useState(null);

  const { data: responses = [] } = useQuery({
    queryKey: ['taskResponses', projectId],
    queryFn: () => base44.entities.TaskResponse.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, taskId }) => {
      await base44.entities.TaskResponse.update(id, { status, admin_notes: notes });
      // Auto-update task status to completed when response is approved
      if (status === 'approved' && taskId) {
        await base44.entities.ProjectTask.update(taskId, { status: 'completed' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['taskResponses']);
      queryClient.invalidateQueries(['projectTasks']);
      setSelectedResponse(null);
      setAdminNotes('');
      toast.success('Response updated');
    }
  });

  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown Task';
  };

  // Parse response_value: may be a JSON array of URLs or a single URL string
  const parseUrls = (value) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  };

  const renderResponseValue = (response) => {
    if (response.response_type === 'location') {
      return (
        <a
          href={`https://maps.google.com/?q=${response.latitude},${response.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-green-600 hover:underline"
        >
          <MapPin className="w-4 h-4" />
          <span>{Number(response.latitude).toFixed(5)}, {Number(response.longitude).toFixed(5)}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    } else if (response.response_type === 'image') {
      const urls = parseUrls(response.response_value);
      return (
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setPreviewResponse(response)}
            className="flex items-center gap-2 text-indigo-600 hover:underline text-sm"
          >
            <ImageIcon className="w-4 h-4" />
            View {urls.length > 1 ? `${urls.length} Images` : 'Image'}
          </button>
          {response.latitude && (
            <a
              href={`https://maps.google.com/?q=${response.latitude},${response.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:underline text-xs"
            >
              <MapPin className="w-3 h-3" />
              {Number(response.latitude).toFixed(5)}, {Number(response.longitude).toFixed(5)}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
    } else if (response.response_type === 'file') {
      const urls = parseUrls(response.response_value);
      return (
        <div className="flex flex-col gap-1">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-sm">
                <FileText className="w-3 h-3" />
                File {urls.length > 1 ? i + 1 : ''}
              </a>
              <a href={url} download className="text-slate-400 hover:text-slate-600" title="Download">
                <Download className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-sm text-slate-700">{response.response_value}</span>;
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Task Responses</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">TASK</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">FREELANCER</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">RESPONSE</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">STATUS</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">SUBMITTED</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {responses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      No responses submitted yet
                    </td>
                  </tr>
                ) : (
                  responses.map((response) => (
                    <tr key={response.id} className="border-b border-slate-100">
                      <td className="px-4 py-4 font-medium">{getTaskName(response.task_id)}</td>
                      <td className="px-4 py-4">{response.freelancer_name}</td>
                      <td className="px-4 py-4">{renderResponseValue(response)}</td>
                      <td className="px-4 py-4">
                        <Badge className={
                          response.status === 'approved' ? 'bg-green-100 text-green-700' :
                          response.status === 'resubmit_required' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {response.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {response.submission_date ? format(new Date(response.submission_date), 'MMM d, h:mm a') : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {response.status === 'submitted' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ 
                                id: response.id, 
                                status: 'approved',
                                notes: '',
                                taskId: response.task_id
                              })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedResponse(response);
                                setAdminNotes('');
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      {previewResponse && (
        <PreviewDialog open onOpenChange={() => setPreviewResponse(null)}>
          <PreviewDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-3">
              <h3 className="font-semibold">{getTaskName(previewResponse.task_id)} — {previewResponse.freelancer_name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parseUrls(previewResponse.response_value).map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Submission ${i + 1}`} className="w-full rounded-lg object-contain max-h-72 bg-slate-50" />
                    <a
                      href={url}
                      download
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-slate-700" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </PreviewDialogContent>
        </PreviewDialog>
      )}

      {/* Resubmit Dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Resubmission</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Provide feedback for <strong>{selectedResponse?.freelancer_name}</strong> to resubmit their response.
            </p>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Explain what needs to be corrected..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedResponse(null)}>Cancel</Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({
                id: selectedResponse?.id,
                status: 'resubmit_required',
                notes: adminNotes
              })}
              className="bg-red-600 hover:bg-red-700"
            >
              Request Resubmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
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
    mutationFn: ({ id, status, notes }) => 
      base44.entities.TaskResponse.update(id, { status, admin_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['taskResponses']);
      setSelectedResponse(null);
      setAdminNotes('');
      toast.success('Response updated');
    }
  });

  const getTaskName = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown Task';
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
      return (
        <button
          onClick={() => setPreviewResponse(response)}
          className="flex items-center gap-2 text-indigo-600 hover:underline"
        >
          <ImageIcon className="w-4 h-4" />
          View Image
        </button>
      );
    } else if (response.response_type === 'file') {
      return (
        <div className="flex items-center gap-2">
          <a
            href={response.response_value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-indigo-600 hover:underline"
          >
            <FileText className="w-4 h-4" />
            View File
          </a>
          <a
            href={response.response_value}
            download
            className="text-slate-500 hover:text-slate-700"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
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
                                notes: ''
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
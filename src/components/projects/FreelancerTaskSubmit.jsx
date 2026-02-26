import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, MapPin, FileText, Image as ImageIcon, Hash, Type, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FreelancerTaskSubmit({ task, existingResponse, userEmail, userName, projectId, onClose }) {
  const queryClient = useQueryClient();
  const [textValue, setTextValue] = useState(existingResponse?.response_value || '');
  const [numberValue, setNumberValue] = useState(existingResponse?.response_value || '');
  const [uploading, setUploading] = useState(false);
  // Support multiple uploads: store as array of {url, name}
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    if (!existingResponse?.response_value) return [];
    // Handle legacy single URL or new JSON array
    try {
      const parsed = JSON.parse(existingResponse.response_value);
      return Array.isArray(parsed) ? parsed : [{ url: existingResponse.response_value, name: 'Existing file' }];
    } catch {
      return [{ url: existingResponse.response_value, name: 'Existing file' }];
    }
  });
  const [location, setLocation] = useState(
    existingResponse?.latitude ? { lat: existingResponse.latitude, lng: existingResponse.longitude } : null
  );
  const [locating, setLocating] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      if (existingResponse && existingResponse.status !== 'approved') {
        return base44.entities.TaskResponse.update(existingResponse.id, {
          ...payload,
          status: 'submitted',
          submission_date: new Date().toISOString()
        });
      }
      return base44.entities.TaskResponse.create({
        task_id: task.id,
        project_id: projectId,
        freelancer_email: userEmail,
        freelancer_name: userName,
        ...payload,
        status: 'submitted',
        submission_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myTaskResponses']);
      toast.success('Response submitted successfully!');
      onClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadedUrl(file_url);
    setUploadedFileName(file.name);
    setUploading(false);
    toast.success('File uploaded!');
  };

  const handleGetLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error('Could not get location. Please allow location access.');
        setLocating(false);
      }
    );
  };

  const handleSubmit = () => {
    if (task.task_type === 'text_entry') {
      if (!textValue.trim()) return toast.error('Please enter a text response');
      submitMutation.mutate({ response_type: 'text', response_value: textValue });
    } else if (task.task_type === 'number_entry') {
      if (!numberValue) return toast.error('Please enter a number');
      submitMutation.mutate({ response_type: 'number', response_value: String(numberValue) });
    } else if (task.task_type === 'image_upload' || task.task_type === 'file_upload') {
      if (!uploadedUrl) return toast.error('Please upload a file first');
      submitMutation.mutate({
        response_type: task.task_type === 'image_upload' ? 'image' : 'file',
        response_value: uploadedUrl
      });
    } else if (task.task_type === 'geo_location') {
      if (!location) return toast.error('Please capture your location first');
      submitMutation.mutate({
        response_type: 'location',
        response_value: `${location.lat},${location.lng}`,
        latitude: location.lat,
        longitude: location.lng
      });
    }
  };

  const isAlreadyApproved = existingResponse?.status === 'approved';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task.description && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{task.description}</p>
          )}

          {existingResponse && (
            <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
              existingResponse.status === 'approved' ? 'bg-green-50 text-green-700' :
              existingResponse.status === 'resubmit_required' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>
              {existingResponse.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="capitalize font-medium">{existingResponse.status.replace('_', ' ')}</span>
              {existingResponse.admin_notes && <span>— {existingResponse.admin_notes}</span>}
            </div>
          )}

          {isAlreadyApproved ? (
            <div className="text-center py-4 text-green-700 font-medium">
              This task has been approved. No resubmission needed.
            </div>
          ) : (
            <>
              {task.task_type === 'text_entry' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Type className="w-4 h-4" /> Your Response</Label>
                  <Textarea
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder="Type your response..."
                    rows={4}
                  />
                </div>
              )}

              {task.task_type === 'number_entry' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Hash className="w-4 h-4" /> Enter Number</Label>
                  <Input
                    type="number"
                    value={numberValue}
                    onChange={(e) => setNumberValue(e.target.value)}
                    placeholder="Enter a number..."
                  />
                </div>
              )}

              {(task.task_type === 'image_upload' || task.task_type === 'file_upload') && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    {task.task_type === 'image_upload' ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {task.task_type === 'image_upload' ? 'Upload Image' : 'Upload File'}
                  </Label>

                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    ) : uploadedUrl ? (
                      <>
                        {task.task_type === 'image_upload' ? (
                          <img src={uploadedUrl} alt="Preview" className="max-h-40 rounded-lg object-contain mb-2" />
                        ) : (
                          <FileText className="w-10 h-10 text-indigo-500 mb-2" />
                        )}
                        <span className="text-sm text-green-600 font-medium">{uploadedFileName || 'File uploaded'}</span>
                        <span className="text-xs text-slate-400 mt-1">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600">Click to upload</span>
                        <span className="text-xs text-slate-400 mt-1">
                          {task.task_type === 'image_upload' ? 'JPG, PNG, WEBP' : 'Any file type'}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept={task.task_type === 'image_upload' ? 'image/*' : '*'}
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}

              {task.task_type === 'geo_location' && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Capture Location</Label>
                  {location ? (
                    <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="w-full"
                    >
                      {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                      {locating ? 'Getting location...' : 'Capture My Location'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!isAlreadyApproved && (
            <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {existingResponse ? 'Resubmit' : 'Submit'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
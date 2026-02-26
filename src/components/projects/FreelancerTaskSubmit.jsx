import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, MapPin, FileText, Image as ImageIcon, Hash, Type, Loader2, CheckCircle, AlertCircle, X, Camera } from "lucide-react";
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
  const [locationAddress, setLocationAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      const a = data.address || {};
      const parts = [
        a.building || a.amenity || a.shop || a.office || a.tourism,
        a.road || a.pedestrian,
        a.suburb || a.neighbourhood,
        a.city || a.town || a.village || a.county,
        a.state,
      ].filter(Boolean);
      return parts.join(', ');
    } catch {
      return '';
    }
  };

  // Auto-capture location when image task opens
  React.useEffect(() => {
    if (task.task_type === 'image_upload' && !existingResponse?.latitude) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setLocation({ lat, lng });
          setLocating(false);
          const addr = await reverseGeocode(lat, lng);
          setLocationAddress(addr);
        },
        () => setLocating(false)
      );
    }
  }, []);

  // Assign stream to video element when both are ready
  React.useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraActive, cameraStream]);

  // Cleanup camera on unmount
  React.useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  const openCamera = async () => {
    // Also grab location at camera open
    if (!location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCameraStream(stream);
      setCameraActive(true);
    } catch (err) {
      toast.error('Could not access camera. Please allow camera permission.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFiles(prev => [...prev, { url: file_url, name: file.name }]);
      setUploading(false);
      toast.success('Photo captured and uploaded!');
      // Stop camera
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraActive(false);
    }, 'image/jpeg', 0.9);
  };

  const closeCamera = () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraActive(false);
  };

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
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const results = await Promise.all(files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { url: file_url, name: file.name };
    }));
    setUploadedFiles(prev => [...prev, ...results]);
    setUploading(false);
    toast.success(`${results.length} file(s) uploaded!`);
    // Reset input so same file can be re-added if needed
    e.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
      if (!uploadedFiles.length) return toast.error('Please upload at least one file');
      const payload = {
        response_type: task.task_type === 'image_upload' ? 'image' : 'file',
        response_value: JSON.stringify(uploadedFiles.map(f => f.url))
      };
      // Attach geo location if captured for image uploads
      if (task.task_type === 'image_upload' && location) {
        payload.latitude = location.lat;
        payload.longitude = location.lng;
      }
      submitMutation.mutate(payload);
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
                    {task.task_type === 'image_upload' ? 'Upload Images' : 'Upload Files'}
                    <span className="text-xs text-slate-400 font-normal">(multiple allowed)</span>
                  </Label>

                  {/* Uploaded files list */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                          {task.task_type === 'image_upload' ? (
                            <img src={file.url} alt={file.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                          ) : (
                            <FileText className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                          )}
                          <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                          <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Camera capture (for image_upload) + regular upload */}
                  {task.task_type === 'image_upload' ? (
                    <div className="space-y-3">
                      {/* Live camera view */}
                      {cameraActive && (
                        <div className="relative rounded-xl overflow-hidden bg-black">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" style={{ maxHeight: 260 }} />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              disabled={uploading}
                              className="bg-white text-slate-800 font-semibold px-5 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-indigo-50"
                            >
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                              {uploading ? 'Uploading...' : 'Click Photo'}
                            </button>
                            <button
                              type="button"
                              onClick={closeCamera}
                              className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
                            >
                              <X className="w-4 h-4" /> Close
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Buttons */}
                      {!cameraActive && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={openCamera}
                            className="flex-1 flex flex-col items-center justify-center border-2 border-indigo-300 rounded-xl p-4 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <Camera className="w-7 h-7 text-indigo-500 mb-1" />
                            <span className="text-sm text-indigo-700 font-semibold">Open Camera</span>
                            <span className="text-xs text-slate-400">Take selfie</span>
                          </button>
                          <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                            <Upload className="w-7 h-7 text-slate-400 mb-1" />
                            <span className="text-sm text-slate-700 font-semibold">From Gallery</span>
                            <span className="text-xs text-slate-400">Select images</span>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                      {uploading ? (
                        <>
                          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-1" />
                          <span className="text-sm text-indigo-600">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-slate-400 mb-1" />
                          <span className="text-sm text-slate-600">Click to add files</span>
                          <span className="text-xs text-slate-400 mt-0.5">PDF, docs, any format — select multiple</span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}

                  {/* Geo location status for image uploads */}
                  {task.task_type === 'image_upload' && (
                    <div className={`flex items-center gap-2 text-sm rounded-lg p-2 ${location ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {locating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Capturing location...</>
                      ) : location ? (
                        <><MapPin className="w-4 h-4" /> Location captured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>Location not captured.</span>
                          <button
                            type="button"
                            className="underline font-medium ml-1"
                            onClick={handleGetLocation}
                          >Retry</button>
                        </>
                      )}
                    </div>
                  )}
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
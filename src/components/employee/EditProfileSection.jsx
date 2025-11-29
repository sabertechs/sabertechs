import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Upload,
  Camera,
  Save,
  Loader2,
  CheckCircle,
  X,
  AlertTriangle,
  Scan
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EditProfileSection({ employee, onUpdate }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Upload docs, Step 2: Review & Edit
  const [uploading, setUploading] = useState({});
  const [extracting, setExtracting] = useState({});
  const [mismatchWarnings, setMismatchWarnings] = useState([]);
  const [extractedData, setExtractedData] = useState({ aadhaar: null, pan: null });
  const [formData, setFormData] = useState({
    date_of_birth: employee?.date_of_birth || "",
    gender: employee?.gender || "",
    address: employee?.address || "",
    locality: employee?.locality || "",
    city: employee?.city || "",
    state: employee?.state || "",
    pincode: employee?.pincode || "",
    profile_photo: employee?.profile_photo || "",
    aadhaar_document: employee?.aadhaar_document || "",
    pan_document: employee?.pan_document || "",
    aadhaar_number: employee?.aadhaar_number || "",
    pan_number: employee?.pan_number || ""
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.update(employee.id, data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setShowEditDialog(false);
      if (onUpdate) onUpdate();
    },
    onError: (err) => {
      toast.error("Failed to update profile: " + err.message);
    }
  });

  const handleFileUpload = async (file, field) => {
    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success("File uploaded successfully!");
      
      // Auto-extract data from Aadhaar or PAN documents
      if (field === "aadhaar_document" || field === "pan_document") {
        await extractDocumentData(file_url, field);
      }
    } catch (err) {
      toast.error("Failed to upload file");
    }
    setUploading(prev => ({ ...prev, [field]: false }));
  };

  const extractDocumentData = async (fileUrl, field) => {
    const docType = field === "aadhaar_document" ? "aadhaar" : "pan";
    setExtracting(prev => ({ ...prev, [docType]: true }));
    
    try {
      const schema = field === "aadhaar_document" ? {
        type: "object",
        properties: {
          aadhaar_number: { type: "string", description: "12-digit Aadhaar number" },
          name: { type: "string", description: "Full name on the card" },
          date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" },
          gender: { type: "string", description: "Gender (male/female/other)" }
        }
      } : {
        type: "object",
        properties: {
          pan_number: { type: "string", description: "10-character PAN number" },
          name: { type: "string", description: "Full name on the card" },
          father_name: { type: "string", description: "Father's name" },
          date_of_birth: { type: "string", description: "Date of birth in YYYY-MM-DD format" }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (result.status === "success" && result.output) {
        const extracted = result.output;
        setExtractedData(prev => ({ ...prev, [docType]: extracted }));
        
        // Auto-fill form with extracted data
        if (docType === "aadhaar") {
          setFormData(prev => ({
            ...prev,
            aadhaar_number: extracted.aadhaar_number?.replace(/\s/g, '') || prev.aadhaar_number,
            date_of_birth: extracted.date_of_birth || prev.date_of_birth,
            gender: extracted.gender?.toLowerCase() || prev.gender
          }));
        } else if (docType === "pan") {
          setFormData(prev => ({
            ...prev,
            pan_number: extracted.pan_number?.toUpperCase() || prev.pan_number,
            date_of_birth: prev.date_of_birth || extracted.date_of_birth // Only fill if empty
          }));
        }
        
        // Check for mismatches between documents
        checkForMismatches(extracted, docType);
        
        toast.success(`${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} data extracted and auto-filled!`);
      }
    } catch (err) {
      console.error("Extraction error:", err);
      toast.error("Could not extract data from document");
    }
    
    setExtracting(prev => ({ ...prev, [docType]: false }));
  };

  const checkForMismatches = (extracted, docType) => {
    const warnings = [...mismatchWarnings.filter(w => w.source !== docType)];
    
    // Check DOB mismatch
    if (extracted.date_of_birth && formData.date_of_birth) {
      const extractedDob = extracted.date_of_birth;
      const formDob = formData.date_of_birth;
      
      if (extractedDob !== formDob) {
        warnings.push({
          source: docType,
          type: "dob",
          message: `Date of Birth mismatch: Your profile shows ${formDob}, but ${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} shows ${extractedDob}`,
          extractedValue: extractedDob
        });
      }
    }

    // Check gender mismatch (for Aadhaar)
    if (docType === "aadhaar" && extracted.gender && formData.gender) {
      if (extracted.gender.toLowerCase() !== formData.gender.toLowerCase()) {
        warnings.push({
          source: docType,
          type: "gender",
          message: `Gender mismatch: Your profile shows ${formData.gender}, but Aadhaar shows ${extracted.gender}`,
          extractedValue: extracted.gender.toLowerCase()
        });
      }
    }

    // Cross-check between Aadhaar and PAN if both exist
    if (docType === "pan" && extractedData.aadhaar) {
      if (extracted.date_of_birth && extractedData.aadhaar.date_of_birth) {
        if (extracted.date_of_birth !== extractedData.aadhaar.date_of_birth) {
          warnings.push({
            source: "cross",
            type: "dob_cross",
            message: `DOB differs between documents: Aadhaar shows ${extractedData.aadhaar.date_of_birth}, PAN shows ${extracted.date_of_birth}`
          });
        }
      }
    }
    
    if (docType === "aadhaar" && extractedData.pan) {
      if (extracted.date_of_birth && extractedData.pan.date_of_birth) {
        if (extracted.date_of_birth !== extractedData.pan.date_of_birth) {
          warnings.push({
            source: "cross",
            type: "dob_cross",
            message: `DOB differs between documents: Aadhaar shows ${extracted.date_of_birth}, PAN shows ${extractedData.pan.date_of_birth}`
          });
        }
      }
    }

    setMismatchWarnings(warnings);
  };

  const applyExtractedValue = (type, value) => {
    if (type === "dob") {
      setFormData(prev => ({ ...prev, date_of_birth: value }));
    } else if (type === "gender") {
      setFormData(prev => ({ ...prev, gender: value }));
    }
    setMismatchWarnings(prev => prev.filter(w => w.type !== type));
    toast.success("Value updated from document");
  };

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  const openEditDialog = () => {
    setFormData({
      date_of_birth: employee?.date_of_birth || "",
      gender: employee?.gender || "",
      address: employee?.address || "",
      locality: employee?.locality || "",
      city: employee?.city || "",
      state: employee?.state || "",
      pincode: employee?.pincode || "",
      profile_photo: employee?.profile_photo || "",
      aadhaar_document: employee?.aadhaar_document || "",
      pan_document: employee?.pan_document || "",
      aadhaar_number: employee?.aadhaar_number || "",
      pan_number: employee?.pan_number || ""
    });
    setMismatchWarnings([]);
    setExtractedData({ aadhaar: null, pan: null });
    // Start at step 1 if documents not uploaded, otherwise step 2
    setStep(employee?.aadhaar_document && employee?.pan_document ? 2 : 1);
    setShowEditDialog(true);
  };

  const canProceedToStep2 = formData.aadhaar_document && formData.pan_document && !extracting.aadhaar && !extracting.pan;

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            My Profile
          </CardTitle>
          <Button onClick={openEditDialog} variant="outline" size="sm">
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {employee?.profile_photo ? (
                <img 
                  src={employee.profile_photo} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {employee?.full_name?.[0] || 'E'}
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Date of Birth</p>
                <p className="font-medium text-slate-800">{employee?.date_of_birth || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Gender</p>
                <p className="font-medium text-slate-800 capitalize">{employee?.gender || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">City</p>
                <p className="font-medium text-slate-800">{employee?.city || 'Not set'}</p>
              </div>
              <div className="col-span-2 md:col-span-3">
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-medium text-slate-800">
                  {employee?.address ? 
                    `${employee.address}, ${employee.locality || ''}, ${employee.city || ''}, ${employee.state || ''} - ${employee.pincode || ''}` 
                    : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Step 1: Upload Documents" : "Step 2: Review & Edit Details"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-green-100 text-green-700'}`}>
                {step > 1 ? <CheckCircle className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-sm">1</span>}
                <span className="text-sm font-medium">Upload Docs</span>
              </div>
              <div className="w-8 h-0.5 bg-slate-200" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-sm">2</span>
                <span className="text-sm font-medium">Review & Edit</span>
              </div>
            </div>

            {step === 1 && (
              <>
                {/* Step 1: Document Uploads */}
                <div className="text-center mb-4">
                  <p className="text-slate-600">Upload your Aadhaar and PAN card to auto-fill your details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Aadhaar Document */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Aadhaar Card *
                      {extracting.aadhaar && <Scan className="w-4 h-4 text-indigo-500 animate-pulse" />}
                    </Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${formData.aadhaar_document ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                      {formData.aadhaar_document ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="text-green-700 font-medium">Uploaded</span>
                            <button 
                              onClick={() => {
                                setFormData(prev => ({ ...prev, aadhaar_document: "", aadhaar_number: "" }));
                                setExtractedData(prev => ({ ...prev, aadhaar: null }));
                              }}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {extracting.aadhaar ? (
                            <p className="text-sm text-indigo-600 flex items-center justify-center gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" /> Extracting details...
                            </p>
                          ) : extractedData.aadhaar && (
                            <div className="text-xs text-slate-600 bg-white rounded p-2 mt-2">
                              <p><strong>Aadhaar:</strong> {extractedData.aadhaar.aadhaar_number || 'N/A'}</p>
                              <p><strong>DOB:</strong> {extractedData.aadhaar.date_of_birth || 'N/A'}</p>
                              <p><strong>Gender:</strong> {extractedData.aadhaar.gender || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "aadhaar_document")}
                          />
                          {uploading.aadhaar_document ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-600 font-medium">Upload Aadhaar Card</span>
                              <p className="text-xs text-slate-400 mt-1">JPG, PNG supported</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* PAN Document */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      PAN Card *
                      {extracting.pan && <Scan className="w-4 h-4 text-indigo-500 animate-pulse" />}
                    </Label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${formData.pan_document ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                      {formData.pan_document ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="text-green-700 font-medium">Uploaded</span>
                            <button 
                              onClick={() => {
                                setFormData(prev => ({ ...prev, pan_document: "", pan_number: "" }));
                                setExtractedData(prev => ({ ...prev, pan: null }));
                              }}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {extracting.pan ? (
                            <p className="text-sm text-indigo-600 flex items-center justify-center gap-1">
                              <Loader2 className="w-4 h-4 animate-spin" /> Extracting details...
                            </p>
                          ) : extractedData.pan && (
                            <div className="text-xs text-slate-600 bg-white rounded p-2 mt-2">
                              <p><strong>PAN:</strong> {extractedData.pan.pan_number || 'N/A'}</p>
                              <p><strong>Name:</strong> {extractedData.pan.name || 'N/A'}</p>
                              <p><strong>DOB:</strong> {extractedData.pan.date_of_birth || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "pan_document")}
                          />
                          {uploading.pan_document ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-600 font-medium">Upload PAN Card</span>
                              <p className="text-xs text-slate-400 mt-1">JPG, PNG supported</p>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mismatch Warnings */}
                {mismatchWarnings.length > 0 && (
                  <div className="space-y-2">
                    {mismatchWarnings.map((warning, idx) => (
                      <Alert key={idx} variant="destructive" className="bg-amber-50 border-amber-300">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Data Mismatch</AlertTitle>
                        <AlertDescription className="text-amber-700">{warning.message}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                {/* Step 2: Review & Edit */}
                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                {formData.profile_photo ? (
                  <div className="relative">
                    <img src={formData.profile_photo} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, profile_photo: "" }))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "profile_photo")}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={uploading.profile_photo} asChild>
                    <span>
                      {uploading.profile_photo ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      Upload Photo
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Extracted Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-lg">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Aadhaar Number
                  {extractedData.aadhaar && <span className="text-xs text-green-600">(Auto-filled)</span>}
                </Label>
                <Input
                  value={formData.aadhaar_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  PAN Number
                  {extractedData.pan && <span className="text-xs text-green-600">(Auto-filled)</span>}
                </Label>
                <Input
                  value={formData.pan_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value.toUpperCase().slice(0, 10) }))}
                  placeholder="10-character PAN"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Date of Birth
                  {extractedData.aadhaar?.date_of_birth && <span className="text-xs text-green-600">(Auto-filled)</span>}
                </Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Gender
                  {extractedData.aadhaar?.gender && <span className="text-xs text-green-600">(Auto-filled)</span>}
                </Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter your address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Locality</Label>
                <Input
                  value={formData.locality}
                  onChange={(e) => setFormData(prev => ({ ...prev, locality: e.target.value }))}
                  placeholder="Locality"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="Pincode"
                />
              </div>
            </div>

            {/* Mismatch Warnings in Step 2 */}
            {mismatchWarnings.length > 0 && (
              <div className="space-y-2">
                {mismatchWarnings.map((warning, idx) => (
                  <Alert key={idx} variant="destructive" className="bg-amber-50 border-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Data Mismatch</AlertTitle>
                    <AlertDescription className="text-amber-700">{warning.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
              </>
            )}
          </div>

          <DialogFooter>
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!canProceedToStep2}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Continue to Review
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
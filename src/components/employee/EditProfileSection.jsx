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
  X
} from "lucide-react";
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
  const [uploading, setUploading] = useState({});
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
    } catch (err) {
      toast.error("Failed to upload file");
    }
    setUploading(prev => ({ ...prev, [field]: false }));
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
    setShowEditDialog(true);
  };

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
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
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

            {/* Document Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  value={formData.aadhaar_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input
                  value={formData.pan_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value.toUpperCase().slice(0, 10) }))}
                  placeholder="10-character PAN"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aadhaar Document</Label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${formData.aadhaar_document ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  {formData.aadhaar_document ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700">Uploaded</span>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, aadhaar_document: "" }))}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "aadhaar_document")}
                      />
                      {uploading.aadhaar_document ? (
                        <Loader2 className="w-6 h-6 mx-auto text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                          <span className="text-sm text-slate-500">Upload Aadhaar</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>PAN Document</Label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${formData.pan_document ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  {formData.pan_document ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700">Uploaded</span>
                      <button 
                        onClick={() => setFormData(prev => ({ ...prev, pan_document: "" }))}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "pan_document")}
                      />
                      {uploading.pan_document ? (
                        <Loader2 className="w-6 h-6 mx-auto text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                          <span className="text-sm text-slate-500">Upload PAN</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
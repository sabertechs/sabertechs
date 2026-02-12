import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Upload, CheckCircle, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import CityAutocomplete from "@/components/forms/CityAutocomplete";
import { INDIAN_STATES } from "@/components/data/indiaData";

export default function EmployeeOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const [employee, setEmployee] = useState(null);
  const [token, setToken] = useState(null);
  const [formData, setFormData] = useState({
    father_name: "",
    date_of_birth: "",
    gender: "",
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    aadhaar_number: "",
    pan_number: "",
    aadhaar_document: "",
    pan_document: "",
    education_certificates: [],
    profile_photo: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
    account_holder_name: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onboardingToken = urlParams.get('token');
    
    if (!onboardingToken) {
      navigate(createPageUrl("Home"));
      return;
    }
    
    setToken(onboardingToken);
    loadEmployeeData(onboardingToken);
  }, []);

  const loadEmployeeData = async (token) => {
    try {
      const employees = await base44.entities.Employee.filter({ onboarding_token: token });
      
      if (employees.length === 0) {
        alert("Invalid or expired onboarding link");
        navigate(createPageUrl("Home"));
        return;
      }
      
      const emp = employees[0];
      
      if (emp.status === 'active') {
        alert("This onboarding link has already been used");
        navigate(createPageUrl("Home"));
        return;
      }
      
      setEmployee(emp);
      setFormData(prev => ({
        ...prev,
        father_name: emp.father_name || "",
        date_of_birth: emp.date_of_birth || "",
        gender: emp.gender || "",
        address: emp.address || "",
        locality: emp.locality || "",
        city: emp.city || "",
        state: emp.state || "",
        pincode: emp.pincode || "",
        aadhaar_number: emp.aadhaar_number || "",
        pan_number: emp.pan_number || "",
        aadhaar_document: emp.aadhaar_document || "",
        pan_document: emp.pan_document || "",
        education_certificates: emp.education_certificates || [],
        profile_photo: emp.profile_photo || "",
        bank_name: emp.bank_name || "",
        bank_account_number: emp.bank_account_number || "",
        bank_ifsc: emp.bank_ifsc || "",
        bank_branch: emp.bank_branch || "",
        account_holder_name: emp.account_holder_name || ""
      }));
      setLoading(false);
    } catch (error) {
      console.error("Error loading employee:", error);
      alert("Failed to load onboarding data");
      navigate(createPageUrl("Home"));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (file, field) => {
    setUploadingDoc(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (field === "education_certificates") {
        setFormData(prev => ({
          ...prev,
          education_certificates: [...prev.education_certificates, file_url]
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: file_url }));
      }
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
    setUploadingDoc(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.father_name.trim()) newErrors.father_name = "Father's name is required";
    if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.locality.trim()) newErrors.locality = "Locality is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    
    if (!formData.aadhaar_number.trim()) {
      newErrors.aadhaar_number = "Aadhaar number is required";
    } else if (!/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
      newErrors.aadhaar_number = "Aadhaar must be exactly 12 digits";
    }
    
    if (!formData.pan_number.trim()) {
      newErrors.pan_number = "PAN number is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = "PAN must be 10 characters (e.g., ABCDE1234F)";
    }
    
    if (!formData.aadhaar_document) newErrors.aadhaar_document = "Aadhaar document is required";
    if (!formData.pan_document) newErrors.pan_document = "PAN document is required";
    if (formData.education_certificates.length === 0) newErrors.education_certificates = "At least one education certificate is required";
    if (!formData.profile_photo) newErrors.profile_photo = "Profile photo is required";
    
    if (!formData.bank_name.trim()) newErrors.bank_name = "Bank name is required";
    if (!formData.bank_account_number.trim()) {
      newErrors.bank_account_number = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.bank_account_number.replace(/\s/g, ''))) {
      newErrors.bank_account_number = "Enter a valid account number (9-18 digits)";
    }
    if (!formData.bank_ifsc.trim()) {
      newErrors.bank_ifsc = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc.toUpperCase())) {
      newErrors.bank_ifsc = "Enter a valid IFSC code (e.g., SBIN0001234)";
    }
    if (!formData.account_holder_name.trim()) newErrors.account_holder_name = "Account holder name is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await base44.entities.Employee.update(employee.id, {
        ...formData,
        pan_number: formData.pan_number.toUpperCase(),
        aadhaar_number: formData.aadhaar_number.replace(/\s/g, ''),
        bank_ifsc: formData.bank_ifsc.toUpperCase(),
        status: "pending",
        bg_verification_status: "pending",
        onboarding_token: null,
        document_review_status: {
          aadhaar_document: 'pending',
          pan_document: 'pending',
          education_certificates: 'pending',
          profile_photo: 'pending'
        }
      });
      
      alert("Profile completed successfully! Your documents will be reviewed by HR.");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <Building2 className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800">Complete Your Profile</h1>
          <p className="text-slate-500 mt-2">Welcome {employee?.full_name}! Please complete your onboarding.</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8 space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={employee?.full_name} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={employee?.email} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Father's Name *</Label>
                  <Input value={formData.father_name} onChange={(e) => handleChange("father_name", e.target.value)} className={errors.father_name ? "border-red-500" : ""} />
                  {errors.father_name && <p className="text-red-500 text-xs">{errors.father_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} className={errors.date_of_birth ? "border-red-500" : ""} />
                  {errors.date_of_birth && <p className="text-red-500 text-xs">{errors.date_of_birth}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Address</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea value={formData.address} onChange={(e) => handleChange("address", e.target.value)} rows={3} className={errors.address ? "border-red-500" : ""} />
                  {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Locality *</Label>
                    <Input value={formData.locality} onChange={(e) => handleChange("locality", e.target.value)} className={errors.locality ? "border-red-500" : ""} />
                    {errors.locality && <p className="text-red-500 text-xs">{errors.locality}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                      <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-red-500 text-xs">{errors.state}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <CityAutocomplete value={formData.city} onChange={(v) => handleChange("city", v)} error={errors.city} />
                    {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input value={formData.pincode} onChange={(e) => handleChange("pincode", e.target.value)} className={errors.pincode ? "border-red-500" : ""} />
                    {errors.pincode && <p className="text-red-500 text-xs">{errors.pincode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aadhaar Number *</Label>
                  <Input value={formData.aadhaar_number} onChange={(e) => handleChange("aadhaar_number", e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="XXXX XXXX XXXX" maxLength={12} className={errors.aadhaar_number ? "border-red-500" : ""} />
                  {errors.aadhaar_number && <p className="text-red-500 text-xs">{errors.aadhaar_number}</p>}
                </div>
                <div className="space-y-2">
                  <Label>PAN Number *</Label>
                  <Input value={formData.pan_number} onChange={(e) => handleChange("pan_number", e.target.value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" maxLength={10} className={errors.pan_number ? "border-red-500" : ""} />
                  {errors.pan_number && <p className="text-red-500 text-xs">{errors.pan_number}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Aadhaar Document *</Label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.aadhaar_document ? 'border-red-500' : 'border-slate-200'}`}>
                    {formData.aadhaar_document ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                        <Button size="sm" variant="outline" onClick={() => handleChange("aadhaar_document", "")}><X className="w-4 h-4 mr-1" /> Remove</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "aadhaar_document")} />
                        {uploadingDoc === "aadhaar_document" ? <Loader2 className="w-8 h-8 mx-auto animate-spin" /> : <><Upload className="w-8 h-8 mx-auto text-slate-400" /><span className="text-sm">Click to upload</span></>}
                      </label>
                    )}
                  </div>
                  {errors.aadhaar_document && <p className="text-red-500 text-xs">{errors.aadhaar_document}</p>}
                </div>

                <div className="space-y-2">
                  <Label>PAN Document *</Label>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.pan_document ? 'border-red-500' : 'border-slate-200'}`}>
                    {formData.pan_document ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
                        <Button size="sm" variant="outline" onClick={() => handleChange("pan_document", "")}><X className="w-4 h-4 mr-1" /> Remove</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "pan_document")} />
                        {uploadingDoc === "pan_document" ? <Loader2 className="w-8 h-8 mx-auto animate-spin" /> : <><Upload className="w-8 h-8 mx-auto text-slate-400" /><span className="text-sm">Click to upload</span></>}
                      </label>
                    )}
                  </div>
                  {errors.pan_document && <p className="text-red-500 text-xs">{errors.pan_document}</p>}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Profile Photo *</Label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.profile_photo ? 'border-red-500' : 'border-slate-200'}`}>
                  {formData.profile_photo ? (
                    <div className="space-y-2">
                      <img src={formData.profile_photo} alt="Profile" className="w-24 h-24 rounded-full mx-auto object-cover" />
                      <Button size="sm" variant="outline" onClick={() => handleChange("profile_photo", "")}><X className="w-4 h-4 mr-1" /> Remove</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "profile_photo")} />
                      {uploadingDoc === "profile_photo" ? <Loader2 className="w-8 h-8 mx-auto animate-spin" /> : <><Upload className="w-8 h-8 mx-auto text-slate-400" /><span className="text-sm">Upload photo</span></>}
                    </label>
                  )}
                </div>
                {errors.profile_photo && <p className="text-red-500 text-xs">{errors.profile_photo}</p>}
              </div>

              <div className="space-y-2 mt-4">
                <Label>Education Certificates * (Max 2)</Label>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.education_certificates ? 'border-red-500' : 'border-slate-200'}`}>
                  {formData.education_certificates.length < 2 ? (
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "education_certificates")} />
                      {uploadingDoc === "education_certificates" ? <Loader2 className="w-8 h-8 mx-auto animate-spin" /> : <><Upload className="w-8 h-8 mx-auto text-slate-400" /><span className="text-sm">Upload ({formData.education_certificates.length}/2)</span></>}
                    </label>
                  ) : (
                    <div className="text-green-600"><CheckCircle className="w-8 h-8 mx-auto" /><span className="text-sm">2/2 uploaded</span></div>
                  )}
                  {formData.education_certificates.length > 0 && (
                    <div className="flex gap-2 justify-center mt-2">
                      {formData.education_certificates.map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded">
                          <span className="text-xs">Cert {idx + 1}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleChange("education_certificates", formData.education_certificates.filter((_, i) => i !== idx))}><X className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.education_certificates && <p className="text-red-500 text-xs">{errors.education_certificates}</p>}
              </div>
            </div>

            {/* Bank Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Holder Name *</Label>
                  <Input value={formData.account_holder_name} onChange={(e) => handleChange("account_holder_name", e.target.value)} className={errors.account_holder_name ? "border-red-500" : ""} />
                  {errors.account_holder_name && <p className="text-red-500 text-xs">{errors.account_holder_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input value={formData.bank_name} onChange={(e) => handleChange("bank_name", e.target.value)} className={errors.bank_name ? "border-red-500" : ""} />
                  {errors.bank_name && <p className="text-red-500 text-xs">{errors.bank_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Account Number *</Label>
                  <Input value={formData.bank_account_number} onChange={(e) => handleChange("bank_account_number", e.target.value.replace(/\D/g, ''))} className={errors.bank_account_number ? "border-red-500" : ""} />
                  {errors.bank_account_number && <p className="text-red-500 text-xs">{errors.bank_account_number}</p>}
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code *</Label>
                  <Input value={formData.bank_ifsc} onChange={(e) => handleChange("bank_ifsc", e.target.value.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" maxLength={11} className={errors.bank_ifsc ? "border-red-500" : ""} />
                  {errors.bank_ifsc && <p className="text-red-500 text-xs">{errors.bank_ifsc}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Branch Name (Optional)</Label>
                  <Input value={formData.bank_branch} onChange={(e) => handleChange("bank_branch", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button onClick={handleSubmit} disabled={saving} className="px-8 bg-indigo-600 hover:bg-indigo-700">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Complete Onboarding"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
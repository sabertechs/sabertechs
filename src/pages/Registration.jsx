import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Upload, CheckCircle, Loader2, User, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    // Current Address
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    // Documents
    aadhaar_number: "",
    pan_number: "",
    aadhaar_document: "",
    pan_document: "",
    education_certificates: [],
    profile_photo: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (file, field) => {
    setUploadingDoc(field);
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
    setUploadingDoc(null);
  };

  const validateStep1 = async () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!formData.father_name.trim()) newErrors.father_name = "Father's name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.locality.trim()) newErrors.locality = "Locality is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    
    // Check for duplicate email and phone if no basic errors
    if (!newErrors.email && !newErrors.phone) {
      setCheckingDuplicate(true);
      const existingByEmail = await base44.entities.Employee.filter({ email: formData.email.trim() });
      if (existingByEmail.length > 0) {
        // Redirect to dashboard if employee already exists
        setCheckingDuplicate(false);
        navigate(createPageUrl("EmployeeDashboard"));
        return false;
      }
      
      const existingByPhone = await base44.entities.Employee.filter({ phone: formData.phone.trim() });
      if (existingByPhone.length > 0) {
        newErrors.phone = "An employee with this phone number already exists";
      }
      setCheckingDuplicate(false);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    // Aadhaar validation - 12 digits
    if (!formData.aadhaar_number.trim()) {
      newErrors.aadhaar_number = "Aadhaar number is required";
    } else if (!/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
      newErrors.aadhaar_number = "Aadhaar must be exactly 12 digits";
    }
    
    // PAN validation - 10 characters
    if (!formData.pan_number.trim()) {
      newErrors.pan_number = "PAN number is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = "PAN must be 10 characters (e.g., ABCDE1234F)";
    }
    
    if (!formData.aadhaar_document) newErrors.aadhaar_document = "Aadhaar document is required";
    if (!formData.pan_document) newErrors.pan_document = "PAN document is required";
    if (formData.education_certificates.length === 0) newErrors.education_certificates = "At least one education certificate is required";
    if (!formData.profile_photo) newErrors.profile_photo = "Profile photo is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        setStep(2);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    setLoading(true);
    await base44.entities.Employee.create({
      ...formData,
      pan_number: formData.pan_number.toUpperCase(),
      aadhaar_number: formData.aadhaar_number.replace(/\s/g, ''),
      status: "pending",
      role: "employee",
      bg_verification_status: "pending"
    });
    setLoading(false);
    navigate(createPageUrl("EmployeeDashboard"));
  };

  const steps = [
    { num: 1, title: "Personal Info", icon: User },
    { num: 2, title: "Documents", icon: FileText }
  ];

  const InputWithError = ({ label, field, type = "text", placeholder, ...props }) => (
    <div className="space-y-2">
      <Label>{label} *</Label>
      <Input
        type={type}
        value={formData[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        className={errors[field] ? "border-red-500" : ""}
        {...props}
      />
      {errors[field] && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">HRMS</h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700">Employee Self-Registration</h2>
          <p className="text-slate-500 mt-2">Complete your profile to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                step === s.num 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : step > s.num 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > s.num ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
                <span className="font-medium hidden sm:inline">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-1 rounded ${step > s.num ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                  <p className="text-slate-500">Enter your basic details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWithError label="Full Name" field="full_name" placeholder="Enter your full name" />
                  <InputWithError label="Father's Name" field="father_name" placeholder="Enter father's name" />
                  <InputWithError label="Email" field="email" type="email" placeholder="your.email@company.com" />
                  <InputWithError label="Phone" field="phone" placeholder="+91 XXXXX XXXXX" />
                  <InputWithError label="Date of Birth" field="date_of_birth" type="date" />
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
                    {errors.gender && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.gender}
                      </p>
                    )}
                  </div>
                </div>

                {/* Current Address Section */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-slate-700 mb-4">Current Address</h4>
                  
                  <div className="space-y-2 mb-4">
                    <Label>Address *</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Enter your complete address"
                      rows={3}
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputWithError label="Locality" field="locality" placeholder="Locality / Area" />
                    <InputWithError label="City" field="city" placeholder="City" />
                    <InputWithError label="State" field="state" placeholder="State" />
                    <InputWithError label="Pincode" field="pincode" placeholder="XXXXXX" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">Document Upload</h3>
                  <p className="text-slate-500">Upload required documents</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Aadhaar Number * (12 digits)</Label>
                    <Input
                      value={formData.aadhaar_number}
                      onChange={(e) => handleChange("aadhaar_number", e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="XXXX XXXX XXXX"
                      className={errors.aadhaar_number ? "border-red-500" : ""}
                      maxLength={12}
                    />
                    {errors.aadhaar_number && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.aadhaar_number}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number * (10 characters)</Label>
                    <Input
                      value={formData.pan_number}
                      onChange={(e) => handleChange("pan_number", e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                      className={errors.pan_number ? "border-red-500" : ""}
                      maxLength={10}
                    />
                    {errors.pan_number && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.pan_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Aadhaar Document *</Label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                      errors.aadhaar_document ? 'border-red-500' : 'border-slate-200'
                    }`}>
                      {formData.aadhaar_document ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span>Uploaded</span>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "aadhaar_document")}
                          />
                          {uploadingDoc === "aadhaar_document" ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-500">Click to upload</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    {errors.aadhaar_document && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.aadhaar_document}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>PAN Document *</Label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                      errors.pan_document ? 'border-red-500' : 'border-slate-200'
                    }`}>
                      {formData.pan_document ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span>Uploaded</span>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "pan_document")}
                          />
                          {uploadingDoc === "pan_document" ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-500">Click to upload</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    {errors.pan_document && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.pan_document}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Education Certificates *</Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                    errors.education_certificates ? 'border-red-500' : 'border-slate-200'
                  }`}>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => {
                          Array.from(e.target.files).forEach(file => {
                            handleFileUpload(file, "education_certificates");
                          });
                        }}
                      />
                      {uploadingDoc === "education_certificates" ? (
                        <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                          <span className="text-slate-500">Click to upload certificates</span>
                        </>
                      )}
                    </label>
                    {formData.education_certificates.length > 0 && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span>{formData.education_certificates.length} file(s) uploaded</span>
                      </div>
                    )}
                  </div>
                  {errors.education_certificates && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.education_certificates}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Profile Photo *</Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                    errors.profile_photo ? 'border-red-500' : 'border-slate-200'
                  }`}>
                    {formData.profile_photo ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={formData.profile_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                        <span className="text-green-600">Uploaded</span>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "profile_photo")}
                        />
                        {uploadingDoc === "profile_photo" ? (
                          <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <span className="text-slate-500">Click to upload photo</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                  {errors.profile_photo && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.profile_photo}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
                className="px-8"
              >
                Previous
              </Button>
              
              {step < 2 ? (
                <Button
                  onClick={handleNext}
                  disabled={checkingDuplicate}
                  className="px-8 bg-indigo-600 hover:bg-indigo-700"
                >
                  {checkingDuplicate ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
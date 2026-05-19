import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Building2 } from "lucide-react";

export default function CandidateApplyPage() {
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", city: "",
    date_of_birth: "", gender: "", qualification: "",
    current_occupation: "", experience_years: "",
    aadhar_number: "", address: "",
    vertical: "", worked_as_invigilator_before: "",
    available_on_drive_date: "", heard_from: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      // Check for existing candidate by phone
      const existing = await base44.entities.Candidate.filter({ phone: form.phone });
      const log_entry = {
        timestamp: new Date().toISOString(),
        action: "Form submitted via public apply page",
        by: "Applicant",
        from_status: null,
        to_status: "Form Filled",
      };

      const payload = {
        ...form,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        worked_as_invigilator_before: form.worked_as_invigilator_before === "yes",
        available_on_drive_date: form.available_on_drive_date === "yes",
        pipeline_status: "Form Filled",
      };

      if (existing.length > 0) {
        const candidate = existing[0];
        const activity_log = [...(candidate.activity_log || []), log_entry];
        await base44.entities.Candidate.update(candidate.id, { ...payload, activity_log });
      } else {
        payload.activity_log = [log_entry];
        payload.source = form.heard_from || "Other";
        await base44.entities.Candidate.create(payload);
      }
      setDone(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Received!</h2>
          <p className="text-slate-600">Thank you! Your application has been received. Our team will contact you shortly.</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Building2 className="w-4 h-4" />SaberTechs
          </div>
        </div>
      </div>
    );
  }

  const Field = ({ label, children, required }) => (
    <div>
      <Label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-slate-800">SaberTechs</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Candidate Application Form</h1>
          <p className="text-slate-500 mt-2">Please fill in your details below to apply</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {/* Personal Info */}
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-100 pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" required>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" required />
            </Field>
            <Field label="Phone Number" required>
              <Input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="10-digit mobile number" required />
            </Field>
            <Field label="Email Address" required>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" required />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Your city" required />
            </Field>
            <Field label="Date of Birth" required>
              <Input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} required />
            </Field>
            <Field label="Gender" required>
              <Select value={form.gender} onValueChange={v => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {["Male","Female","Other"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Aadhaar Number" required>
              <Input value={form.aadhar_number} onChange={e => set("aadhar_number", e.target.value)} placeholder="12-digit Aadhaar" required />
            </Field>
          </div>

          <Field label="Address" required>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address" required />
          </Field>

          {/* Education & Work */}
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-100 pb-2 pt-2">Education & Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Highest Qualification" required>
              <Select value={form.qualification} onValueChange={v => set("qualification", v)}>
                <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                <SelectContent>
                  {["Graduate","Post Graduate","PhD","Other"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Current Occupation">
              <Input value={form.current_occupation} onChange={e => set("current_occupation", e.target.value)} placeholder="e.g. Teacher, Student" />
            </Field>
            <Field label="Years of Experience">
              <Input type="number" min="0" value={form.experience_years} onChange={e => set("experience_years", e.target.value)} placeholder="0" />
            </Field>
          </div>

          {/* Role & Availability */}
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-100 pb-2 pt-2">Role & Availability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Role Applied For" required>
              <Select value={form.vertical} onValueChange={v => set("vertical", v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["Invigilator","Centre Supervisor","Online Proctor"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Worked as invigilator before?" required>
              <Select value={form.worked_as_invigilator_before} onValueChange={v => set("worked_as_invigilator_before", v)}>
                <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Available on drive date?" required>
              <Select value={form.available_on_drive_date} onValueChange={v => set("available_on_drive_date", v)}>
                <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="How did you hear about us?" required>
              <Select value={form.heard_from} onValueChange={v => set("heard_from", v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {["Naukri","WhatsApp","Reference","Other"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold">
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
          <p className="text-xs text-slate-400 text-center">By submitting, you agree to be contacted by our recruitment team.</p>
        </form>
      </div>
    </div>
  );
}
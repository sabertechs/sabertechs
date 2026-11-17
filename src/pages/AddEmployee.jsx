import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Loader2, UserPlus, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { createEntity } from "@/lib/entityMutations";

const EMPTY_FORM = {
  full_name: "",
  email: "",
  phone: "",
  designation: "",
  date_of_joining: "",
  salary: ""
};

// Keeps only the 10-digit national number (strips +91 / leading zero).
const normalizePhone = (value) => {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length > 10 && /^(91|0)/.test(digits)) return digits.slice(-10);
  return digits.slice(0, 10);
};

export default function AddEmployee() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState(null);
  const [createdName, setCreatedName] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: designationPermissions = [] } = useQuery({
    queryKey: ['designation-permissions'],
    queryFn: () => base44.entities.DesignationPermission.list('display_order'),
    staleTime: 10 * 60 * 1000,
  });

  const designations = designationPermissions.map(dp => ({ id: dp.id, name: dp.designation_name }));

  const update = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const validate = () => {
    const next = {};
    if (!formData.full_name.trim()) next.full_name = "Full name is required";
    const email = formData.email.trim().toLowerCase();
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address";
    if (!formData.phone) next.phone = "Phone number is required";
    else if (formData.phone.length !== 10) next.phone = "Enter a valid 10-digit mobile number";
    if (!formData.designation) next.designation = "Select a designation";
    if (!formData.date_of_joining) next.date_of_joining = "Joining date is required";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const employees = await base44.entities.Employee.list('-employee_id', 1);
      let newEmployeeId = "66001";

      if (employees.length > 0 && employees[0].employee_id) {
        const lastId = parseInt(employees[0].employee_id);
        if (!isNaN(lastId)) {
          newEmployeeId = String(lastId + 1);
        }
      }

      const token = generateToken();
      const employeeName = formData.full_name.trim();

      const employeeData = {
        full_name: employeeName,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        designation: formData.designation,
        date_of_joining: formData.date_of_joining,
        employee_id: newEmployeeId,
        employment_type: "permanent",
        status: "pending",
        bg_verification_status: "pending",
        onboarding_token: token
      };

      // Only add salary if it has a value
      if (formData.salary !== "" && formData.salary !== null) {
        employeeData.salary = parseFloat(formData.salary);
      }

      await createEntity('Employee', employeeData);

      const link = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}#/EmployeeOnboarding?token=${token}`;
      setCreatedName(employeeName);
      setOnboardingLink(link);
      setFormData(EMPTY_FORM);
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (error) {
      console.error('Error creating employee:', error);

      // Parse error message for specific field errors
      if (error.response?.data?.message) {
        const errorMsg = error.response.data.message;
        if (errorMsg.includes('email')) {
          setErrors({ email: "Invalid email or email already exists" });
        } else if (errorMsg.includes('phone')) {
          setErrors({ phone: "Invalid phone number" });
        } else {
          setErrors({ general: errorMsg });
        }
      } else {
        setErrors({ general: "Failed to create employee. Please check your input and try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startAnother = () => {
    setOnboardingLink(null);
    setCreatedName("");
    setCopied(false);
    setErrors({});
    setFormData(EMPTY_FORM);
  };

  const fieldClass = (field) => (errors[field] ? "border-red-500 focus-visible:ring-red-500" : "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Add New Employee</h2>
        <p className="text-slate-500">Create the employee record, then share the onboarding link so they can complete their profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-7">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              {/* Personal details */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Personal details</h3>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="full_name"
                    autoFocus
                    value={formData.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className={fieldClass('full_name')}
                  />
                  {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      value={formData.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="name@company.com"
                      className={fieldClass('email')}
                    />
                    {errors.email
                      ? <p className="text-xs text-red-600">{errors.email}</p>
                      : <p className="text-xs text-slate-400">The employee signs in with this email</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) => update('phone', normalizePhone(e.target.value))}
                      placeholder="9876543210"
                      className={fieldClass('phone')}
                    />
                    {errors.phone
                      ? <p className="text-xs text-red-600">{errors.phone}</p>
                      : <p className="text-xs text-slate-400">10-digit mobile number</p>}
                  </div>
                </div>
              </section>

              {/* Employment details */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employment details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Designation <span className="text-red-500">*</span></Label>
                    <Select value={formData.designation} onValueChange={(v) => update('designation', v)}>
                      <SelectTrigger className={fieldClass('designation')}>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {designations.length > 0 ? designations.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        )) : (
                          <SelectItem value="_none" disabled>No designations configured</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.designation
                      ? <p className="text-xs text-red-600">{errors.designation}</p>
                      : <p className="text-xs text-slate-400">New designations are added in Designation Access</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_joining">Joining Date <span className="text-red-500">*</span></Label>
                    <Input
                      id="date_of_joining"
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => update('date_of_joining', e.target.value)}
                      className={fieldClass('date_of_joining')}
                    />
                    {errors.date_of_joining && <p className="text-xs text-red-600">{errors.date_of_joining}</p>}
                  </div>
                </div>

                <div className="space-y-2 sm:max-w-xs">
                  <Label htmlFor="salary">Monthly Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    inputMode="numeric"
                    value={formData.salary}
                    onChange={(e) => update('salary', e.target.value)}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-slate-400">Can be added or changed later</p>
                </div>
              </section>

              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create & Generate Link
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="w-5 h-5 text-green-600" />
              Onboarding Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingLink ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {createdName || 'Employee'} created successfully
                  </p>
                  <div className="bg-white rounded p-3 mt-3 break-all text-sm text-slate-600 border border-green-200">
                    {onboardingLink}
                  </div>
                </div>

                <Button onClick={copyLink} className="w-full" variant="outline">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>

                <Button onClick={startAnother} variant="ghost" className="w-full text-slate-600">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add another employee
                </Button>

                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Next Steps:</h4>
                  <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Copy the onboarding link above</li>
                    <li>Share it with the employee via WhatsApp, Email, or SMS</li>
                    <li>Employee completes their profile using the link</li>
                    <li>Review and approve their documents</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6 text-slate-400">
                  <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Fill the form to generate a unique onboarding link</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">What happens next</h4>
                  <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                    <li>Employee record is created as <strong>pending</strong></li>
                    <li>You share the onboarding link with them</li>
                    <li>They complete their profile and upload documents</li>
                    <li>You verify the documents and activate the account</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
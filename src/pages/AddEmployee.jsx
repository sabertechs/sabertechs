import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Loader2, UserPlus, Link as LinkIcon } from "lucide-react";

const DEFAULT_DEPARTMENTS = [
  { id: "admin", name: "Admin" },
  { id: "quality_analyst", name: "Quality Analyst" },
  { id: "cashifty", name: "Cashifty" },
  { id: "mettl_operations", name: "Mettl operations" },
  { id: "mettl", name: "Mettl" },
  { id: "proctoring", name: "Proctoring" },
];

export default function AddEmployee() {
  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const getSetting = (key, defaultValue) => {
    const setting = appSettings.find(s => s.setting_key === key);
    return setting?.setting_value || defaultValue;
  };

  const departments = getSetting('departments', DEFAULT_DEPARTMENTS);
  const designations = getSetting('designations', []);

  const [loading, setLoading] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    date_of_joining: "",
    salary: "",
    role: "employee"
  });

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validate required fields
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.department.trim()) newErrors.department = "Department is required";
    if (!formData.designation.trim()) newErrors.designation = "Designation is required";
    if (!formData.date_of_joining) newErrors.date_of_joining = "Joining date is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
      
      const employeeData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        department: formData.department.toLowerCase(),
        designation: formData.designation.trim(),
        date_of_joining: formData.date_of_joining,
        role: formData.role,
        employee_id: newEmployeeId,
        employment_type: "permanent",
        status: "pending",
        bg_verification_status: "pending",
        onboarding_token: token
      };
      
      // Only add salary if it has a value
      if (formData.salary && formData.salary.trim() !== '') {
        employeeData.salary = parseFloat(formData.salary);
      }
      
      await base44.entities.Employee.create(employeeData);

      const link = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}#/EmployeeOnboarding?token=${token}`;
      setOnboardingLink(link);
      
      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        date_of_joining: "",
        salary: "",
        role: "employee"
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Add New Employee</h2>
        <p className="text-slate-500">Create employee record and generate onboarding link</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Employee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                  className={errors.full_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    className={errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                    <SelectTrigger className={errors.department ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-xs text-red-600">{errors.department}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Designation *</Label>
                  <Select value={formData.designation} onValueChange={(v) => setFormData({...formData, designation: v})}>
                    <SelectTrigger className={errors.designation ? "border-red-500" : ""}>
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
                  {errors.designation && <p className="text-xs text-red-600">{errors.designation}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Joining Date *</Label>
                  <Input 
                    type="date"
                    value={formData.date_of_joining} 
                    onChange={(e) => setFormData({...formData, date_of_joining: e.target.value})} 
                    className={errors.date_of_joining ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {errors.date_of_joining && <p className="text-xs text-red-600">{errors.date_of_joining}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Monthly Salary</Label>
                  <Input 
                    type="number"
                    value={formData.salary} 
                    onChange={(e) => setFormData({...formData, salary: e.target.value})} 
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-green-600" />
              Onboarding Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {onboardingLink ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-3 font-medium">✓ Employee created successfully!</p>
                  <div className="bg-white rounded p-3 break-all text-sm text-slate-600 border border-green-200">
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
              <div className="text-center py-12 text-slate-400">
                <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Fill the form and click "Create & Generate Link"</p>
                <p className="text-xs mt-1">A unique onboarding link will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
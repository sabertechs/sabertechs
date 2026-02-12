import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Loader2, UserPlus, Link as LinkIcon } from "lucide-react";

export default function AddEmployee() {
  const [loading, setLoading] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState(null);
  const [copied, setCopied] = useState(false);
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
      alert('Failed to create employee. Please try again.');
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
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Input 
                    value={formData.department} 
                    onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation *</Label>
                  <Input 
                    value={formData.designation} 
                    onChange={(e) => setFormData({...formData, designation: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Joining Date *</Label>
                  <Input 
                    type="date"
                    value={formData.date_of_joining} 
                    onChange={(e) => setFormData({...formData, date_of_joining: e.target.value})} 
                    required 
                  />
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
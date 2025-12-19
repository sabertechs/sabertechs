import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getNotificationEmail, getOfferLetterEmail, getBGVStatusEmail, getPayslipEmail } from "@/components/email/EmailTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function TestEmail() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailType, setEmailType] = useState("notification");
  const [previewHtml, setPreviewHtml] = useState("");

  const employeeData = {
    email: "devenderchawla18@gmail.com",
    name: "devender pal singh",
    designation: "C.C.E",
    department: "cce",
    salary: 21000,
    joiningDate: "November 27, 2025"
  };

  const getEmailContent = (type) => {
    switch(type) {
      case "notification":
        return {
          subject: "Welcome to SaberTechs HRMS",
          body: getNotificationEmail({
            recipientName: employeeData.name,
            title: "Welcome to SaberTechs HRMS",
            message: "This is a sample notification email to demonstrate the professional email template. You can now access all HRMS features including attendance tracking, payslips, and expense management.",
            link: "https://sabertechs.base44.app"
          })
        };
      case "offer_letter":
        return {
          subject: "🎉 Congratulations! Your Offer Letter from SaberTechs",
          body: getOfferLetterEmail({
            recipientName: employeeData.name,
            designation: employeeData.designation,
            department: employeeData.department,
            joiningDate: employeeData.joiningDate,
            salary: employeeData.salary
          })
        };
      case "bgv_approved":
        return {
          subject: "Background Verification Approved - SaberTechs",
          body: getBGVStatusEmail({
            recipientName: employeeData.name,
            status: "approved"
          })
        };
      case "payslip":
        return {
          subject: "💰 Payslip for November 2025 - SaberTechs",
          body: getPayslipEmail({
            recipientName: employeeData.name,
            month: "November",
            year: 2025,
            netSalary: 18500
          })
        };
      default:
        return null;
    }
  };

  const handlePreview = () => {
    const content = getEmailContent(emailType);
    setPreviewHtml(content.body);
  };

  const handleSend = async () => {
    setSending(true);
    const content = getEmailContent(emailType);
    
    try {
      const response = await base44.functions.invoke('sendTestEmail', {
        to: employeeData.email,
        subject: content.subject,
        body: content.body
      });
      
      setSending(false);
      setSent(true);
      toast.success(`Email sent successfully from ${response.data.from}!`);
      
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      setSending(false);
      toast.error('Failed to send email');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email Template Preview & Test
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Email Type</label>
              <Select value={emailType} onValueChange={(v) => { setEmailType(v); setPreviewHtml(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">📬 General Notification</SelectItem>
                  <SelectItem value="offer_letter">🎉 Offer Letter</SelectItem>
                  <SelectItem value="bgv_approved">✅ BGV Approved</SelectItem>
                  <SelectItem value="payslip">💰 Payslip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview}>
                Preview
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : sent ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Sent!</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" /> Send to {employeeData.email}</>
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Recipient:</strong> {employeeData.name} ({employeeData.email})
            </p>
          </div>

          {previewHtml && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b">
                <p className="text-sm font-medium text-slate-700">Email Preview</p>
              </div>
              <iframe 
                srcDoc={previewHtml}
                className="w-full h-[600px] bg-white"
                title="Email Preview"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
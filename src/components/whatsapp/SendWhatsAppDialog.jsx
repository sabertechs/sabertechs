import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { MessageCircle, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MESSAGE_TEMPLATES = {
  onboarding: {
    label: "Onboarding Welcome",
    message: `Hello {name}! 👋

Welcome to Saber Technologies! We're excited to have you join our team.

Your onboarding process has been initiated. Please complete the following:
✅ Submit your documents
✅ Complete background verification
✅ Review company policies

If you have any questions, feel free to reach out to HR.

Best regards,
HR Team`
  },
  salary: {
    label: "Salary Credit",
    message: `Hello {name},

Your salary for the month has been credited to your registered bank account.

💰 Amount: ₹{amount}
📅 Month: {month}

Please check your bank account for the credit. Your payslip is available in the HRMS portal.

Regards,
HR Team`
  },
  payslip: {
    label: "Payslip Available",
    message: `Hello {name},

Your payslip for {month} is now available.

You can download it from the HRMS portal under "My Payslips" section.

Regards,
HR Team`
  },
  project: {
    label: "New Project Assignment",
    message: `Hello {name},

You have been assigned to a new project!

📋 Project: {project_name}
📅 Start Date: {start_date}
👤 Reporting To: {manager}

Please coordinate with your team lead for further details.

Best regards,
Management`
  },
  custom: {
    label: "Custom Message",
    message: ""
  }
};

export default function SendWhatsAppDialog({ open, onClose, employee, defaultTemplate = "custom" }) {
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState(defaultTemplate);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(employee?.phone || "");

  React.useEffect(() => {
    if (employee?.phone) {
      setPhone(employee.phone);
    }
    if (template && template !== "custom") {
      let msg = MESSAGE_TEMPLATES[template]?.message || "";
      msg = msg.replace(/{name}/g, employee?.full_name || "Employee");
      setMessage(msg);
    }
  }, [employee, template]);

  const handleTemplateChange = (value) => {
    setTemplate(value);
    if (value !== "custom") {
      let msg = MESSAGE_TEMPLATES[value]?.message || "";
      msg = msg.replace(/{name}/g, employee?.full_name || "Employee");
      setMessage(msg);
    } else {
      setMessage("");
    }
  };

  const handleSend = async () => {
    if (!phone || !message) {
      toast.error("Phone number and message are required");
      return;
    }

    setSending(true);
    try {
      const response = await base44.functions.invoke('sendWhatsApp', {
        phone: phone,
        message: message
      });

      if (response.data?.success) {
        toast.success("WhatsApp message sent successfully!");
        onClose();
      } else {
        toast.error(response.data?.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send WhatsApp message");
      console.error(error);
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Send WhatsApp Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {employee && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {employee.full_name?.[0] || 'E'}
              </div>
              <div>
                <p className="font-medium text-slate-800">{employee.full_name}</p>
                <p className="text-sm text-slate-500">{employee.phone}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label>Message Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_TEMPLATES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Use placeholders: {"{name}"}, {"{amount}"}, {"{month}"}, {"{project_name}"}, etc.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || !phone || !message}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
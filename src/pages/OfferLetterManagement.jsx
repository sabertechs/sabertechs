import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Send, Download, Search, FileText, Mail, Loader2, CheckSquare } from "lucide-react";
import { getOfferLetterEmail } from "@/components/email/EmailTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OfferLetterManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    employee_email: "",
    employee_name: "",
    designation: "",
    department: "",
    salary: "",
    joining_date: "",
    terms: ""
  });

  const { data: offerLetters = [] } = useQuery({
    queryKey: ['offerLetters'],
    queryFn: () => base44.entities.OfferLetter.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OfferLetter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['offerLetters']);
      setShowCreateDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OfferLetter.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['offerLetters'])
  });

  const resetForm = () => {
    setFormData({
      employee_email: "",
      employee_name: "",
      designation: "",
      department: "",
      salary: "",
      joining_date: "",
      terms: ""
    });
  };

  const handleEmployeeSelect = (email) => {
    const emp = employees.find(e => e.email === email);
    if (emp) {
      setFormData({
        ...formData,
        employee_email: emp.email,
        employee_name: emp.full_name,
        designation: emp.designation || "",
        department: emp.department || "",
        salary: emp.salary || "",
        joining_date: emp.date_of_joining || ""
      });
    }
  };

  const handleCreate = () => {
    createMutation.mutate({
      ...formData,
      salary: parseFloat(formData.salary),
      status: "draft",
      offer_date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleSendBulk = async () => {
    setSending(true);
    for (const letterId of selectedLetters) {
      const letter = offerLetters.find(l => l.id === letterId);
      if (letter) {
        // Update status
        await base44.entities.OfferLetter.update(letterId, { status: 'sent' });

        // Create in-app notification
        await base44.entities.Notification.create({
          recipient_email: letter.employee_email,
          title: 'Offer Letter Received',
          message: `Your offer letter for ${letter.designation} position has been sent.`,
          type: 'info'
        });

        // Send professional email
        const emailBody = getOfferLetterEmail({
          recipientName: letter.employee_name,
          designation: letter.designation,
          department: letter.department,
          joiningDate: letter.joining_date ? format(new Date(letter.joining_date), 'MMMM d, yyyy') : 'TBD',
          salary: letter.salary
        });
        
        await base44.integrations.Core.SendEmail({
          to: letter.employee_email,
          subject: '🎉 Congratulations! Your Offer Letter from SaberTechs',
          body: emailBody
        });
      }
    }
    queryClient.invalidateQueries(['offerLetters']);
    setSelectedLetters([]);
    setSending(false);
  };

  const toggleSelect = (id) => {
    setSelectedLetters(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const draftLetters = filteredLetters.filter(l => l.status === 'draft');
    if (selectedLetters.length === draftLetters.length) {
      setSelectedLetters([]);
    } else {
      setSelectedLetters(draftLetters.map(l => l.id));
    }
  };

  const filteredLetters = offerLetters.filter(letter =>
    letter.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    letter.employee_email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Offer Letters</h2>
          <p className="text-slate-500">Generate and manage offer letters</p>
        </div>
        <div className="flex gap-2">
          {selectedLetters.length > 0 && (
            <Button 
              onClick={handleSendBulk} 
              disabled={sending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Selected ({selectedLetters.length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Offer Letter
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Offer Letters List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4">
                    <Checkbox 
                      checked={selectedLetters.length === filteredLetters.filter(l => l.status === 'draft').length && filteredLetters.filter(l => l.status === 'draft').length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Position</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Salary</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Joining Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLetters.map((letter) => (
                  <tr key={letter.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {letter.status === 'draft' && (
                        <Checkbox 
                          checked={selectedLetters.includes(letter.id)}
                          onCheckedChange={() => toggleSelect(letter.id)}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{letter.employee_name}</p>
                        <p className="text-sm text-slate-500">{letter.employee_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{letter.designation}</p>
                      <p className="text-sm text-slate-500 capitalize">{letter.department}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">₹{letter.salary?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {letter.joining_date ? format(new Date(letter.joining_date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={statusColors[letter.status]}>
                        {letter.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {letter.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              updateMutation.mutate({ id: letter.id, data: { status: 'sent' }});
                              await base44.entities.Notification.create({
                                recipient_email: letter.employee_email,
                                title: 'Offer Letter Received',
                                message: `Your offer letter for ${letter.designation} position has been sent.`,
                                type: 'info'
                              });
                              
                              // Send professional email
                              const emailBody = getOfferLetterEmail({
                                recipientName: letter.employee_name,
                                designation: letter.designation,
                                department: letter.department,
                                joiningDate: letter.joining_date ? format(new Date(letter.joining_date), 'MMMM d, yyyy') : 'TBD',
                                salary: letter.salary
                              });
                              
                              await base44.integrations.Core.SendEmail({
                                to: letter.employee_email,
                                subject: '🎉 Congratulations! Your Offer Letter from SaberTechs',
                                body: emailBody
                              });
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {letter.letter_url && (
                          <a href={letter.letter_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Offer Letter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={formData.employee_email} onValueChange={handleEmployeeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>{emp.full_name} ({emp.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salary (₹)</Label>
                <Input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Enter any additional terms..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.employee_email || !formData.designation}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
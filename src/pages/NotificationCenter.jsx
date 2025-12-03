import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { getNotificationEmail } from "@/components/email/EmailTemplate";
import {
  Bell,
  Send,
  Clock,
  Users,
  Briefcase,
  Mail,
  Smartphone,
  Image,
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Megaphone,
  Calendar,
  Filter,
  Search,
  MessageCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_type: "all",
    target_value: "",
    notification_type: "info",
    send_email: false,
    send_in_app: true,
    send_whatsapp: false,
    link_url: "",
    image_url: "",
    scheduled_time: "",
    status: "scheduled"
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: scheduledNotifications = [] } = useQuery({
    queryKey: ['scheduledNotifications'],
    queryFn: () => base44.entities.ScheduledNotification.list('-created_date'),
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const designations = [...new Set(employees.map(e => e.designation).filter(Boolean))];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledNotification.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledNotifications']);
      resetForm();
      setShowDialog(false);
      toast.success('Notification scheduled successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduledNotification.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledNotifications']);
      resetForm();
      setShowDialog(false);
      toast.success('Notification updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledNotifications']);
      toast.success('Notification deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      target_type: "all",
      target_value: "",
      notification_type: "info",
      send_email: false,
      send_in_app: true,
      send_whatsapp: false,
      link_url: "",
      image_url: "",
      scheduled_time: "",
      status: "scheduled"
    });
    setEditingNotification(null);
  };

  const handleEdit = (notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title || "",
      message: notification.message || "",
      target_type: notification.target_type || "all",
      target_value: notification.target_value || "",
      notification_type: notification.notification_type || "info",
      send_email: notification.send_email || false,
      send_in_app: notification.send_in_app !== false,
      send_whatsapp: notification.send_whatsapp || false,
      link_url: notification.link_url || "",
      image_url: notification.image_url || "",
      scheduled_time: notification.scheduled_time || "",
      status: notification.status || "scheduled"
    });
    setShowDialog(true);
  };

  const getTargetEmployees = () => {
    if (formData.target_type === "all") return employees;
    if (formData.target_type === "department") {
      return employees.filter(e => e.department === formData.target_value);
    }
    if (formData.target_type === "designation") {
      return employees.filter(e => e.designation === formData.target_value);
    }
    if (formData.target_type === "specific") {
      return employees.filter(e => e.email === formData.target_value);
    }
    return [];
  };

  const sendNotificationNow = async () => {
    setSending(true);
    const targetEmployees = getTargetEmployees();
    
    let inAppCount = 0;
    let emailCount = 0;
    let whatsappCount = 0;
    
    try {
      // Create in-app notifications
      if (formData.send_in_app) {
        for (const emp of targetEmployees) {
          try {
            await base44.entities.Notification.create({
              recipient_email: emp.email,
              title: formData.title,
              message: formData.message,
              type: formData.notification_type,
              link: formData.link_url || undefined,
              is_read: false
            });
            inAppCount++;
          } catch (err) {
            console.error('In-app notification error for', emp.email, err);
          }
        }
      }

      // Send emails with professional template
      if (formData.send_email) {
        for (const emp of targetEmployees) {
          try {
            const emailBody = getNotificationEmail({
              recipientName: emp.full_name,
              title: formData.title,
              message: formData.message + (formData.image_url ? `<br/><img src="${formData.image_url}" style="max-width:300px;margin:10px 0;border-radius:8px;" />` : ''),
              link: formData.link_url || null
            });
            
            await base44.integrations.Core.SendEmail({
              to: emp.email,
              subject: formData.title,
              body: emailBody
            });
            emailCount++;
          } catch (err) {
            console.error('Email send error for', emp.email, err);
          }
        }
      }

      // Send WhatsApp messages
      if (formData.send_whatsapp) {
        for (const emp of targetEmployees) {
          if (emp.phone) {
            try {
              const whatsappMessage = `*${formData.title}*\n\n${formData.message}${formData.link_url ? `\n\n🔗 ${formData.link_url}` : ''}`;
              const response = await base44.functions.invoke('sendWhatsApp', {
                phone: emp.phone,
                message: whatsappMessage
              });
              console.log('WhatsApp response for', emp.email, response);
              if (response.data?.success) {
                whatsappCount++;
              }
            } catch (err) {
              console.error('WhatsApp send error for', emp.email, err);
            }
          }
        }
      }

      // Save to scheduled notifications as sent
      await base44.entities.ScheduledNotification.create({
        ...formData,
        status: "sent",
        sent_count: targetEmployees.length,
        scheduled_time: new Date().toISOString()
      });

      queryClient.invalidateQueries(['scheduledNotifications']);
      
      // Show detailed success message
      const parts = [];
      if (formData.send_in_app) parts.push(`${inAppCount} in-app`);
      if (formData.send_email) parts.push(`${emailCount} email`);
      if (formData.send_whatsapp) parts.push(`${whatsappCount} WhatsApp`);
      toast.success(`Sent: ${parts.join(', ')}`);
      resetForm();
      setShowDialog(false);
    } catch (error) {
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const scheduleNotification = () => {
    if (!formData.scheduled_time) {
      toast.error('Please select a scheduled time');
      return;
    }
    
    if (editingNotification) {
      updateMutation.mutate({ id: editingNotification.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const cancelScheduled = async (notification) => {
    await base44.entities.ScheduledNotification.update(notification.id, { status: 'cancelled' });
    queryClient.invalidateQueries(['scheduledNotifications']);
    toast.success('Notification cancelled');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'alert': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'announcement': return <Megaphone className="w-4 h-4 text-purple-600" />;
      default: return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'alert': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'announcement': return 'bg-purple-100 text-purple-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const filteredNotifications = scheduledNotifications.filter(n => {
    const matchesSearch = n.title?.toLowerCase().includes(search.toLowerCase()) ||
                         n.message?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || n.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: scheduledNotifications.length,
    scheduled: scheduledNotifications.filter(n => n.status === 'scheduled').length,
    sent: scheduledNotifications.filter(n => n.status === 'sent').length,
    cancelled: scheduledNotifications.filter(n => n.status === 'cancelled').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notification Center</h2>
          <p className="text-slate-500">Send and manage notifications to employees</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Bell className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.scheduled}</p>
                <p className="text-sm text-slate-500">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.sent}</p>
                <p className="text-sm text-slate-500">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                <XCircle className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.cancelled}</p>
                <p className="text-sm text-slate-500">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Notification</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Target</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Channels</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Scheduled</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notification) => (
                  <tr key={notification.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {getTypeIcon(notification.notification_type)}
                        <div>
                          <p className="font-medium text-slate-800">{notification.title}</p>
                          <p className="text-sm text-slate-500 line-clamp-1">{notification.message}</p>
                          <div className="flex gap-2 mt-1">
                            {notification.link_url && (
                              <Badge variant="outline" className="text-xs">
                                <LinkIcon className="w-3 h-3 mr-1" /> Link
                              </Badge>
                            )}
                            {notification.image_url && (
                              <Badge variant="outline" className="text-xs">
                                <Image className="w-3 h-3 mr-1" /> Image
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {notification.target_type === 'all' && <Users className="w-4 h-4 text-slate-400" />}
                        {notification.target_type === 'department' && <Briefcase className="w-4 h-4 text-slate-400" />}
                        {notification.target_type === 'designation' && <Users className="w-4 h-4 text-slate-400" />}
                        <span className="capitalize text-slate-600">
                          {notification.target_type === 'all' ? 'All Employees' : notification.target_value}
                        </span>
                      </div>
                      {notification.sent_count > 0 && (
                        <p className="text-xs text-slate-400 mt-1">Sent to {notification.sent_count} people</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {notification.send_in_app && (
                          <Badge variant="outline" className="text-xs">
                            <Smartphone className="w-3 h-3 mr-1" /> App
                          </Badge>
                        )}
                        {notification.send_email && (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="w-3 h-3 mr-1" /> Email
                          </Badge>
                        )}
                        {notification.send_whatsapp && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                            <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {notification.scheduled_time ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {format(new Date(notification.scheduled_time), 'MMM d, yyyy HH:mm')}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={
                        notification.status === 'sent' ? 'bg-green-100 text-green-700' :
                        notification.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {notification.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {notification.status === 'scheduled' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(notification)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => cancelScheduled(notification)} className="text-amber-600">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(notification.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredNotifications.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Bell className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p>No notifications found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNotification ? 'Edit Notification' : 'Create Notification'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notification title"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notification message"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Notification Type</Label>
                  <Select value={formData.notification_type} onValueChange={(v) => setFormData({ ...formData, notification_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={formData.target_type} onValueChange={(v) => setFormData({ ...formData, target_type: v, target_value: "" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="department">By Department</SelectItem>
                      <SelectItem value="designation">By Designation</SelectItem>
                      <SelectItem value="specific">Specific Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.target_type === 'department' && (
                <div className="space-y-2">
                  <Label>Select Department</Label>
                  <Select value={formData.target_value} onValueChange={(v) => setFormData({ ...formData, target_value: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.target_type === 'designation' && (
                <div className="space-y-2">
                  <Label>Select Designation</Label>
                  <Select value={formData.target_value} onValueChange={(v) => setFormData({ ...formData, target_value: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map(des => (
                        <SelectItem key={des} value={des}>{des}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.target_type === 'specific' && (
                <div className="space-y-2">
                  <Label>Select Employee</Label>
                  <Select value={formData.target_value} onValueChange={(v) => setFormData({ ...formData, target_value: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.email}>{emp.full_name} ({emp.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Target Preview */}
              {formData.target_type && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    Will be sent to <strong>{getTargetEmployees().length}</strong> employee(s)
                  </p>
                </div>
              )}
            </div>

            {/* Delivery Channels */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Delivery Channels</Label>
              <div className="flex gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.send_in_app}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_in_app: checked })}
                  />
                  <Label className="flex items-center gap-1">
                    <Smartphone className="w-4 h-4" /> In-App Notification
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.send_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
                  />
                  <Label className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.send_whatsapp}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_whatsapp: checked })}
                  />
                  <Label className="flex items-center gap-1 text-green-600">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </Label>
                </div>
              </div>
            </div>

            {/* Rich Content */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Rich Content (Optional)</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <LinkIcon className="w-4 h-4" /> Link URL
                  </Label>
                  <Input
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Image className="w-4 h-4" /> Image URL
                  </Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              {formData.image_url && (
                <div className="mt-3">
                  <img src={formData.image_url} alt="Preview" className="max-h-32 rounded-lg border" />
                </div>
              )}
            </div>

            {/* Scheduling */}
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Schedule (Optional)</Label>
              <div className="mt-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Clock className="w-4 h-4" /> Send at specific time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>
              Cancel
            </Button>
            {formData.scheduled_time ? (
              <Button onClick={scheduleNotification} className="bg-amber-600 hover:bg-amber-700">
                <Clock className="w-4 h-4 mr-2" />
                Schedule Notification
              </Button>
            ) : (
              <Button onClick={sendNotificationNow} disabled={sending || !formData.title || !formData.message} className="bg-indigo-600 hover:bg-indigo-700">
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Now
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
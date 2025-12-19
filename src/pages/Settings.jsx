import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Briefcase,
  Receipt,
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  Mail,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

const DEFAULT_DEPARTMENTS = [
  { id: "admin", name: "Admin" },
  { id: "quality_analyst", name: "Quality Analyst" },
  { id: "cashifty", name: "Cashifty" },
  { id: "mettl_operations", name: "Mettl operations" },
  { id: "mettl", name: "Mettl" },
  { id: "proctoring", name: "Proctoring" },
];

const DEFAULT_ROLES = [
  { id: "employee", name: "Employee" },
  { id: "department_head", name: "Department Head" },
  { id: "manager", name: "Manager" },
  { id: "hr", name: "HR" },
];

const DEFAULT_EXPENSE_TYPES = [
  { id: "travel", name: "Travel" },
  { id: "meals", name: "Meals" },
  { id: "accommodation", name: "Accommodation" },
  { id: "supplies", name: "Supplies" },
  { id: "communication", name: "Communication" },
  { id: "other", name: "Other" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("departments");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dialogType, setDialogType] = useState("");
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  // Fetch settings
  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list('-date'),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => base44.entities.LeaveType.list(),
  });

  // Get setting by key or return default
  const getSetting = (key, defaultValue) => {
    const setting = appSettings.find(s => s.setting_key === key);
    return setting?.setting_value || defaultValue;
  };

  const departments = getSetting('departments', DEFAULT_DEPARTMENTS);
  const roles = getSetting('roles', DEFAULT_ROLES);
  const designations = getSetting('designations', []);
  const expenseTypes = getSetting('expense_types', DEFAULT_EXPENSE_TYPES);

  const [emailConfig, setEmailConfig] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    smtp_user: "",
    smtp_password: "",
    from_name: "SaberTechs HR",
    from_email: ""
  });

  // Load email config when appSettings changes
  useEffect(() => {
    const savedConfig = getSetting('email_config', null);
    if (savedConfig && Object.keys(savedConfig).length > 0) {
      setEmailConfig(savedConfig);
    }
  }, [appSettings.length]);

  // Save setting mutation
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const existing = appSettings.find(s => s.setting_key === key);
      if (existing) {
        return base44.entities.AppSettings.update(existing.id, { setting_value: value });
      } else {
        return base44.entities.AppSettings.create({ setting_key: key, setting_value: value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appSettings']);
      toast.success('Settings saved');
    }
  });

  // Holiday mutations
  const createHolidayMutation = useMutation({
    mutationFn: (data) => base44.entities.Holiday.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setShowAddDialog(false);
      toast.success('Holiday added');
    }
  });

  const updateHolidayMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Holiday.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      setShowAddDialog(false);
      setEditingItem(null);
      toast.success('Holiday updated');
    }
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id) => base44.entities.Holiday.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['holidays']);
      toast.success('Holiday deleted');
    }
  });

  // Leave type mutations
  const createLeaveTypeMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      setShowAddDialog(false);
      toast.success('Leave type added');
    }
  });

  const updateLeaveTypeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      setShowAddDialog(false);
      setEditingItem(null);
      toast.success('Leave type updated');
    }
  });

  const deleteLeaveTypeMutation = useMutation({
    mutationFn: (id) => base44.entities.LeaveType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['leaveTypes']);
      toast.success('Leave type deleted');
    }
  });

  const openAddDialog = (type) => {
    setDialogType(type);
    setEditingItem(null);
    setFormData({});
    setShowAddDialog(true);
  };

  const openEditDialog = (type, item) => {
    setDialogType(type);
    setEditingItem(item);
    setFormData(item);
    setShowAddDialog(true);
  };

  const handleAddItem = async (type, newItem) => {
    let currentList;
    let settingKey;
    
    switch (type) {
      case 'department':
        currentList = [...departments];
        settingKey = 'departments';
        break;
      case 'designation':
        currentList = [...designations];
        settingKey = 'designations';
        break;
      case 'expense_type':
        currentList = [...expenseTypes];
        settingKey = 'expense_types';
        break;
      default:
        return;
    }

    if (editingItem) {
      const index = currentList.findIndex(i => i.id === editingItem.id);
      if (index !== -1) {
        currentList[index] = newItem;
      }
    } else {
      currentList.push(newItem);
    }

    await saveSettingMutation.mutateAsync({ key: settingKey, value: currentList });
    setShowAddDialog(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (type, itemId) => {
    let currentList;
    let settingKey;
    
    switch (type) {
      case 'department':
        currentList = departments.filter(i => i.id !== itemId);
        settingKey = 'departments';
        break;
      case 'designation':
        currentList = designations.filter(i => i.id !== itemId);
        settingKey = 'designations';
        break;
      case 'expense_type':
        currentList = expenseTypes.filter(i => i.id !== itemId);
        settingKey = 'expense_types';
        break;
      default:
        return;
    }

    await saveSettingMutation.mutateAsync({ key: settingKey, value: currentList });
  };

  const handleSaveHoliday = () => {
    if (editingItem) {
      updateHolidayMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createHolidayMutation.mutate({ ...formData, year: new Date(formData.date).getFullYear() });
    }
  };

  const handleSaveLeaveType = () => {
    if (editingItem) {
      updateLeaveTypeMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createLeaveTypeMutation.mutate(formData);
    }
  };

  const handleSaveEmailConfig = async () => {
    // Validate required fields
    if (!emailConfig.smtp_user || !emailConfig.smtp_password) {
      toast.error('Email address and app password are required');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving email config:', emailConfig);
      await saveSettingMutation.mutateAsync({ key: 'email_config', value: emailConfig });
      console.log('Email config saved successfully');
      setShowSuccessDialog(true);
      toast.success('Email configuration saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save configuration: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderListSection = (title, items, type, icon) => (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <Button size="sm" onClick={() => openAddDialog(type)}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge 
              key={item.id} 
              variant="secondary" 
              className="px-3 py-1.5 text-sm flex items-center gap-2"
            >
              {item.name}
              <button 
                onClick={() => openEditDialog(type, item)}
                className="hover:text-indigo-600"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button 
                onClick={() => handleDeleteItem(type, item.id)}
                className="hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {items.length === 0 && (
            <p className="text-slate-500 text-sm">No items added yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500">Configure system defaults and options</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="expenses">Expense Types</TabsTrigger>
          <TabsTrigger value="leaves">Leave Types</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="email">Email Config</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          {renderListSection("Departments", departments, "department", <Building2 className="w-5 h-5 text-indigo-600" />)}
        </TabsContent>

        <TabsContent value="designations" className="mt-6">
          {renderListSection("Designations", designations, "designation", <Briefcase className="w-5 h-5 text-purple-600" />)}
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          {renderListSection("Expense Types", expenseTypes, "expense_type", <Receipt className="w-5 h-5 text-green-600" />)}
        </TabsContent>

        <TabsContent value="leaves" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
                Leave Types
              </CardTitle>
              <Button size="sm" onClick={() => openAddDialog('leave_type')}>
                <Plus className="w-4 h-4 mr-1" /> Add Leave Type
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Days/Year</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Paid</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Carry Forward</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((leave) => (
                      <tr key={leave.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium">{leave.name}</td>
                        <td className="px-4 py-3 text-slate-600">{leave.code || '-'}</td>
                        <td className="px-4 py-3">{leave.days_allowed}</td>
                        <td className="px-4 py-3">
                          <Badge className={leave.is_paid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                            {leave.is_paid ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {leave.carry_forward ? `Yes (${leave.max_carry_forward_days || 0} days)` : 'No'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={leave.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {leave.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog('leave_type', leave)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteLeaveTypeMutation.mutate(leave.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {leaveTypes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No leave types configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Configuration (GSuite/Gmail)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Setup Instructions for GSuite:</strong>
                </p>
                <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
                  <li>Go to your Google Account settings</li>
                  <li>Enable 2-Step Verification if not already enabled</li>
                  <li>Go to Security → App passwords</li>
                  <li>Generate a new app password for "Mail"</li>
                  <li>Use that app password below (not your regular password)</li>
                </ol>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={emailConfig.smtp_host}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address (Username)</Label>
                  <Input
                    type="email"
                    value={emailConfig.smtp_user}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_user: e.target.value, from_email: e.target.value })}
                    placeholder="your-email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>App Password</Label>
                  <Input
                    type="password"
                    value={emailConfig.smtp_password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                    placeholder="Enter app password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input
                    value={emailConfig.from_name}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                    placeholder="SaberTechs HR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={emailConfig.from_email}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                    placeholder="hr@company.com"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={handleSaveEmailConfig} 
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Email Configuration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="w-5 h-5 text-red-600" />
                Holiday List {new Date().getFullYear()}
              </CardTitle>
              <Button size="sm" onClick={() => openAddDialog('holiday')}>
                <Plus className="w-4 h-4 mr-1" /> Add Holiday
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Date</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Holiday Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">Type</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((holiday) => (
                      <tr key={holiday.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium">
                          {holiday.date && !isNaN(new Date(holiday.date).getTime()) ? format(new Date(holiday.date), 'MMM d, yyyy (EEEE)') : '-'}
                        </td>
                        <td className="px-4 py-3">{holiday.name}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            holiday.type === 'national' ? 'bg-red-100 text-red-700' :
                            holiday.type === 'regional' ? 'bg-blue-100 text-blue-700' :
                            holiday.type === 'optional' ? 'bg-amber-100 text-amber-700' :
                            'bg-purple-100 text-purple-700'
                          }>
                            {holiday.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog('holiday', holiday)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteHolidayMutation.mutate(holiday.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {holidays.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          No holidays configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {dialogType.replace('_', ' ')}
            </DialogTitle>
          </DialogHeader>

          {(dialogType === 'department' || dialogType === 'designation' || dialogType === 'expense_type') && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>ID (unique key)</Label>
                <Input
                  value={formData.id || ''}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g. sales_dept"
                  disabled={!!editingItem}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Display name"
                />
              </div>
            </div>
          )}

          {dialogType === 'holiday' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Holiday Name</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Diwali"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type || 'national'} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {dialogType === 'leave_type' && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Name</Label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Casual Leave"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CL"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Days Allowed Per Year</Label>
                <Input
                  type="number"
                  value={formData.days_allowed || ''}
                  onChange={(e) => setFormData({ ...formData, days_allowed: parseInt(e.target.value) })}
                  placeholder="12"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Is Paid Leave</Label>
                <Switch
                  checked={formData.is_paid !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Allow Carry Forward</Label>
                <Switch
                  checked={formData.carry_forward || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, carry_forward: checked })}
                />
              </div>
              {formData.carry_forward && (
                <div className="space-y-2">
                  <Label>Max Carry Forward Days</Label>
                  <Input
                    type="number"
                    value={formData.max_carry_forward_days || ''}
                    onChange={(e) => setFormData({ ...formData, max_carry_forward_days: parseInt(e.target.value) })}
                    placeholder="5"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Is Active</Label>
                <Switch
                  checked={formData.is_active !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (dialogType === 'holiday') {
                  handleSaveHoliday();
                } else if (dialogType === 'leave_type') {
                  handleSaveLeaveType();
                } else {
                  handleAddItem(dialogType, formData);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Config Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Email Configuration Saved
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Your email configuration has been saved successfully. The app will now use these settings to send emails.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">SMTP Server</p>
              <p className="font-medium">{emailConfig.smtp_host}:{emailConfig.smtp_port}</p>
              <p className="text-sm text-slate-500 mt-2">From Email</p>
              <p className="font-medium">{emailConfig.smtp_user}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)} className="bg-indigo-600 hover:bg-indigo-700">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
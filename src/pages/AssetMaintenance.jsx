import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Wrench,
  Search,
  CheckCircle,
  Clock,
  Upload
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssetMaintenance() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "",
    asset_name: "",
    maintenance_type: "service",
    description: "",
    vendor_name: "",
    cost: "",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    status: "scheduled",
    invoice_url: "",
    notes: ""
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: () => base44.entities.MaintenanceLog.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.MaintenanceLog.create({
        ...data,
        cost: data.cost ? parseFloat(data.cost) : null
      });
      
      if (data.status === 'in_progress') {
        const asset = assets.find(a => a.id === data.asset_id);
        if (asset) {
          await base44.entities.Asset.update(data.asset_id, { status: 'in_repair' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ logId, status, assetId }) => {
      await base44.entities.MaintenanceLog.update(logId, { 
        status,
        end_date: status === 'completed' ? format(new Date(), 'yyyy-MM-dd') : null
      });
      
      if (status === 'completed') {
        await base44.entities.Asset.update(assetId, { status: 'available' });
      } else if (status === 'in_progress') {
        await base44.entities.Asset.update(assetId, { status: 'in_repair' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  });

  const resetForm = () => {
    setFormData({
      asset_id: "",
      asset_name: "",
      maintenance_type: "service",
      description: "",
      vendor_name: "",
      cost: "",
      start_date: format(new Date(), 'yyyy-MM-dd'),
      status: "scheduled",
      invoice_url: "",
      notes: ""
    });
  };

  const handleAssetSelect = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        asset_id: asset.id,
        asset_name: asset.name
      }));
    }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, invoice_url: file_url }));
    setUploading(false);
  };

  const filteredLogs = maintenanceLogs.filter(log => {
    const matchesSearch = 
      log.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.vendor_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Maintenance</h2>
          <p className="text-slate-500">Track repairs and service history</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Log Maintenance
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by asset or vendor..."
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
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Logs */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    log.status === 'completed' ? 'bg-green-100' :
                    log.status === 'in_progress' ? 'bg-amber-100' :
                    'bg-slate-100'
                  }`}>
                    {log.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : log.status === 'in_progress' ? (
                      <Wrench className="w-6 h-6 text-amber-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{log.asset_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">{log.maintenance_type}</Badge>
                      {log.vendor_name && (
                        <span className="text-sm text-slate-500">by {log.vendor_name}</span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-2">{log.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>Started: {log.start_date ? format(new Date(log.start_date), 'MMM d, yyyy') : '-'}</span>
                      {log.end_date && <span>Completed: {format(new Date(log.end_date), 'MMM d, yyyy')}</span>}
                      {log.cost && <span className="font-medium text-slate-700">Cost: ₹{log.cost.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={
                    log.status === 'completed' ? 'bg-green-100 text-green-700' :
                    log.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {log.status?.replace('_', ' ')}
                  </Badge>
                  {log.status === 'scheduled' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ 
                        logId: log.id, 
                        status: 'in_progress',
                        assetId: log.asset_id 
                      })}
                    >
                      Start
                    </Button>
                  )}
                  {log.status === 'in_progress' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatusMutation.mutate({ 
                        logId: log.id, 
                        status: 'completed',
                        assetId: log.asset_id 
                      })}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredLogs.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-500">
              <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No maintenance logs found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Maintenance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Asset *</Label>
              <Select value={formData.asset_id} onValueChange={handleAssetSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.maintenance_type} onValueChange={(v) => setFormData(p => ({ ...p, maintenance_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="upgrade">Upgrade</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the maintenance work..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData(p => ({ ...p, vendor_name: e.target.value }))}
                  placeholder="Vendor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData(p => ({ ...p, cost: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice</Label>
              <div className="flex items-center gap-2">
                {formData.invoice_url ? (
                  <a href={formData.invoice_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm underline">
                    View Invoice
                  </a>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-400">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                    />
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Upload Invoice'}</span>
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.asset_id || !formData.description || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? 'Saving...' : 'Log Maintenance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
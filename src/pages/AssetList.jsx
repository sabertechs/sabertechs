import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Wrench,
  Eye,
  Package,
  Laptop,
  Smartphone,
  Monitor,
  Armchair,
  Server,
  FileText,
  Upload,
  X,
  QrCode
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AssetAssignDialog from "@/components/assets/AssetAssignDialog";
import AssetViewDialog from "@/components/assets/AssetViewDialog";
import QRScanner from "@/components/assets/QRScanner";

const categoryIcons = {
  laptop: Laptop,
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Smartphone,
  monitor: Monitor,
  printer: FileText,
  furniture: Armchair,
  software: Package,
  networking: Server,
  other: Package
};

const categories = [
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "monitor", label: "Monitor" },
  { value: "printer", label: "Printer" },
  { value: "furniture", label: "Furniture" },
  { value: "software", label: "Software" },
  { value: "networking", label: "Networking" },
  { value: "other", label: "Other" }
];

const statuses = [
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "in_repair", label: "In Repair" },
  { value: "retired", label: "Retired" },
  { value: "lost", label: "Lost" }
];

export default function AssetList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "laptop",
    serial_number: "",
    image_url: "",
    purchase_date: "",
    purchase_cost: "",
    vendor_name: "",
    vendor_contact: "",
    warranty_months: "",
    location: "",
    depreciation_method: "straight_line",
    useful_life_years: "5",
    salvage_value: "0",
    notes: ""
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  // Check URL for action param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setShowAddDialog(true);
    }
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Asset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Asset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddDialog(false);
      setSelectedAsset(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Asset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowDeleteDialog(false);
      setSelectedAsset(null);
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "laptop",
      serial_number: "",
      image_url: "",
      purchase_date: "",
      purchase_cost: "",
      vendor_name: "",
      vendor_contact: "",
      warranty_months: "",
      location: "",
      depreciation_method: "straight_line",
      useful_life_years: "5",
      salvage_value: "0",
      notes: ""
    });
  };

  const generateAssetId = (category) => {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const handleSubmit = () => {
    const purchaseDate = formData.purchase_date ? new Date(formData.purchase_date) : null;
    let warrantyExpiry = null;
    if (purchaseDate && formData.warranty_months) {
      warrantyExpiry = new Date(purchaseDate);
      warrantyExpiry.setMonth(warrantyExpiry.getMonth() + parseInt(formData.warranty_months));
    }

    const assetData = {
      ...formData,
      asset_id: selectedAsset?.asset_id || generateAssetId(formData.category),
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
      warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
      warranty_expiry: warrantyExpiry ? format(warrantyExpiry, 'yyyy-MM-dd') : null,
      useful_life_years: parseInt(formData.useful_life_years) || 5,
      salvage_value: parseFloat(formData.salvage_value) || 0,
      status: selectedAsset?.status || 'available'
    };

    if (selectedAsset) {
      updateMutation.mutate({ id: selectedAsset.id, data: assetData });
    } else {
      createMutation.mutate(assetData);
    }
  };

  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name || "",
      category: asset.category || "laptop",
      serial_number: asset.serial_number || "",
      image_url: asset.image_url || "",
      purchase_date: asset.purchase_date || "",
      purchase_cost: asset.purchase_cost?.toString() || "",
      vendor_name: asset.vendor_name || "",
      vendor_contact: asset.vendor_contact || "",
      warranty_months: asset.warranty_months?.toString() || "",
      location: asset.location || "",
      depreciation_method: asset.depreciation_method || "straight_line",
      useful_life_years: asset.useful_life_years?.toString() || "5",
      salvage_value: asset.salvage_value?.toString() || "0",
      notes: asset.notes || ""
    });
    setShowAddDialog(true);
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(search.toLowerCase()) ||
      asset.asset_id?.toLowerCase().includes(search.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Assets</h2>
          <p className="text-slate-500">{filteredAssets.length} assets found</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowQRScanner(true)} variant="outline">
            <QrCode className="w-4 h-4 mr-2" /> Scan QR
          </Button>
          <Button onClick={() => { resetForm(); setSelectedAsset(null); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, or serial number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Asset Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Asset</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Assigned To</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Location</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-500">Value</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const Icon = categoryIcons[asset.category] || Package;
                  return (
                    <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                            {asset.image_url ? (
                              <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                            ) : (
                              <Icon className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{asset.name}</p>
                            <p className="text-sm text-slate-500">{asset.asset_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 capitalize text-slate-600">{asset.category}</td>
                      <td className="p-4">
                        <Badge className={
                          asset.status === 'available' ? 'bg-green-100 text-green-700' :
                          asset.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                          asset.status === 'in_repair' ? 'bg-amber-100 text-amber-700' :
                          asset.status === 'retired' ? 'bg-slate-100 text-slate-700' :
                          'bg-red-100 text-red-700'
                        }>
                          {asset.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-600">{asset.assigned_to_name || '-'}</td>
                      <td className="p-4 text-slate-600">{asset.location || '-'}</td>
                      <td className="p-4 font-medium text-slate-800">
                        {asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedAsset(asset); setShowViewDialog(true); }}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(asset)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {asset.status === 'available' && (
                              <DropdownMenuItem onClick={() => { setSelectedAsset(asset); setShowAssignDialog(true); }}>
                                <UserPlus className="w-4 h-4 mr-2" /> Assign
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => { setSelectedAsset(asset); setShowDeleteDialog(true); }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p>No assets found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Asset Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Dell Latitude 5520"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                placeholder="Enter serial number"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Floor 2, Desk 15"
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Cost (₹)</Label>
              <Input
                type="number"
                value={formData.purchase_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_cost: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                placeholder="Vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty (Months)</Label>
              <Input
                type="number"
                value={formData.warranty_months}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty_months: e.target.value }))}
                placeholder="12"
              />
            </div>
            <div className="space-y-2">
              <Label>Depreciation Method</Label>
              <Select value={formData.depreciation_method} onValueChange={(v) => setFormData(prev => ({ ...prev, depreciation_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">Straight Line</SelectItem>
                  <SelectItem value="reducing_balance">Reducing Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Useful Life (Years)</Label>
              <Input
                type="number"
                value={formData.useful_life_years}
                onChange={(e) => setFormData(prev => ({ ...prev, useful_life_years: e.target.value }))}
                placeholder="5"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Asset Image</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={formData.image_url} alt="Asset" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-400">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                    />
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  </label>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedAsset ? 'Update Asset' : 'Add Asset'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      {showAssignDialog && selectedAsset && (
        <AssetAssignDialog
          asset={selectedAsset}
          open={showAssignDialog}
          onClose={() => { setShowAssignDialog(false); setSelectedAsset(null); }}
        />
      )}

      {/* View Dialog */}
      {showViewDialog && selectedAsset && (
        <AssetViewDialog
          asset={selectedAsset}
          open={showViewDialog}
          onClose={() => { setShowViewDialog(false); setSelectedAsset(null); }}
        />
      )}

      {/* QR Scanner */}
      <QRScanner
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(scannedData) => {
          // Check if asset exists by asset_id, serial_number, or id
          const asset = assets.find(a => 
            a.asset_id === scannedData || 
            a.id === scannedData || 
            a.serial_number === scannedData
          );
          if (asset) {
            setSelectedAsset(asset);
            setShowViewDialog(true);
          } else {
            // Asset not found - offer to create new asset with scanned barcode as serial number
            const createNew = window.confirm(`No asset found with code: ${scannedData}\n\nWould you like to add a new asset with this as the serial number?`);
            if (createNew) {
              resetForm();
              setFormData(prev => ({ ...prev, serial_number: scannedData }));
              setSelectedAsset(null);
              setShowAddDialog(true);
            }
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAsset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedAsset.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
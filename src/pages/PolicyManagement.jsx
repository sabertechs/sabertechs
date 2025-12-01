import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const categories = [
  { value: "hr", label: "HR Policies" },
  { value: "it", label: "IT & Security" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
  { value: "compliance", label: "Compliance" },
  { value: "safety", label: "Health & Safety" },
  { value: "general", label: "General" },
];

const categoryColors = {
  hr: "bg-purple-100 text-purple-700",
  it: "bg-blue-100 text-blue-700",
  finance: "bg-green-100 text-green-700",
  operations: "bg-amber-100 text-amber-700",
  compliance: "bg-red-100 text-red-700",
  safety: "bg-orange-100 text-orange-700",
  general: "bg-slate-100 text-slate-700",
};

export default function PolicyManagement() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    file_url: "",
    version: "1.0",
    effective_date: format(new Date(), "yyyy-MM-dd"),
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.CompanyPolicy.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyPolicy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanyPolicy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanyPolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setDeleteDialog(null);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "general",
      file_url: "",
      version: "1.0",
      effective_date: format(new Date(), "yyyy-MM-dd"),
      is_active: true,
    });
    setEditingPolicy(null);
    setDialogOpen(false);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData((prev) => ({ ...prev, file_url }));
    setUploading(false);
  };

  const handleSubmit = () => {
    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      title: policy.title || "",
      description: policy.description || "",
      category: policy.category || "general",
      file_url: policy.file_url || "",
      version: policy.version || "1.0",
      effective_date: policy.effective_date || format(new Date(), "yyyy-MM-dd"),
      is_active: policy.is_active !== false,
    });
    setDialogOpen(true);
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company Policies</h1>
          <p className="text-slate-500">Manage and publish company policies</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Add Policy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Policies Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No policies found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Policy</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Category</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Version</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Effective Date</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((policy) => (
                    <tr key={policy.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-800">{policy.title}</p>
                          {policy.description && (
                            <p className="text-sm text-slate-500 line-clamp-1">{policy.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={categoryColors[policy.category] || categoryColors.general}>
                          {categories.find((c) => c.value === policy.category)?.label || "General"}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-600">{policy.version || "1.0"}</td>
                      <td className="p-4 text-slate-600">
                        {policy.effective_date ? format(new Date(policy.effective_date), "MMM d, yyyy") : "-"}
                      </td>
                      <td className="p-4">
                        {policy.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(policy.file_url, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeleteDialog(policy)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Add New Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Policy Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Leave Policy"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the policy"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Policy Document *</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center">
                {formData.file_url ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Document uploaded</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => window.open(formData.file_url, "_blank")}
                    >
                      View
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                    />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <span className="text-slate-500">Click to upload PDF or DOC</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.file_url || createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingPolicy ? "Update Policy" : "Add Policy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDialog.id)}
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
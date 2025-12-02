import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Package,
  Calendar,
  MapPin,
  User,
  FileText,
  Shield,
  TrendingDown,
  Wrench,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssetViewDialog({ asset, open, onClose }) {
  const queryClient = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['assetAssignments', asset.id],
    queryFn: () => base44.entities.AssetAssignment.filter({ asset_id: asset.id }, '-created_date'),
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenanceLogs', asset.id],
    queryFn: () => base44.entities.MaintenanceLog.filter({ asset_id: asset.id }, '-created_date'),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Asset.update(asset.id, {
        status: 'available',
        assigned_to_email: null,
        assigned_to_name: null,
        assigned_date: null
      });
      
      await base44.entities.AssetAssignment.create({
        asset_id: asset.id,
        asset_name: asset.name,
        employee_email: asset.assigned_to_email,
        employee_name: asset.assigned_to_name,
        return_date: format(new Date(), 'yyyy-MM-dd'),
        action: 'returned'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assetAssignments', asset.id] });
      onClose();
    }
  });

  // Calculate depreciation
  const calculateCurrentValue = () => {
    if (!asset.purchase_date || !asset.purchase_cost) return asset.purchase_cost || 0;
    const purchaseDate = new Date(asset.purchase_date);
    const today = new Date();
    const yearsOwned = (today - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
    const usefulLife = asset.useful_life_years || 5;
    const salvage = asset.salvage_value || 0;
    
    if (asset.depreciation_method === 'reducing_balance') {
      const rate = 1 - Math.pow(salvage / asset.purchase_cost, 1 / usefulLife);
      return Math.max(salvage, asset.purchase_cost * Math.pow(1 - rate, yearsOwned));
    } else {
      const annualDep = (asset.purchase_cost - salvage) / usefulLife;
      return Math.max(salvage, asset.purchase_cost - (annualDep * yearsOwned));
    }
  };

  const currentValue = calculateCurrentValue();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
              {asset.image_url ? (
                <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-800">{asset.name}</h3>
              <p className="text-slate-500">{asset.asset_id}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="capitalize">{asset.category}</Badge>
                <Badge className={
                  asset.status === 'available' ? 'bg-green-100 text-green-700' :
                  asset.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                  asset.status === 'in_repair' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {asset.status?.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            {asset.status === 'assigned' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Return Asset
              </Button>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FileText className="w-4 h-4" /> Serial Number
              </div>
              <p className="font-medium">{asset.serial_number || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <MapPin className="w-4 h-4" /> Location
              </div>
              <p className="font-medium">{asset.location || '-'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Calendar className="w-4 h-4" /> Purchase Date
              </div>
              <p className="font-medium">
                {asset.purchase_date ? format(new Date(asset.purchase_date), 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingDown className="w-4 h-4" /> Purchase Cost
              </div>
              <p className="font-medium">
                {asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString()}` : '-'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Shield className="w-4 h-4" /> Warranty Expiry
              </div>
              <p className="font-medium">
                {asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                <TrendingDown className="w-4 h-4" /> Current Book Value
              </div>
              <p className="font-semibold text-green-700">₹{Math.round(currentValue).toLocaleString()}</p>
            </div>
          </div>

          {/* Assigned To */}
          {asset.assigned_to_name && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                <User className="w-4 h-4" /> Currently Assigned To
              </div>
              <p className="font-semibold text-blue-800">{asset.assigned_to_name}</p>
              <p className="text-sm text-blue-600">{asset.assigned_to_email}</p>
              {asset.assigned_date && (
                <p className="text-sm text-blue-500 mt-1">
                  Since {format(new Date(asset.assigned_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          )}

          {/* Assignment History */}
          {assignments.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Assignment History
              </h4>
              <div className="space-y-2">
                {assignments.slice(0, 5).map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{a.employee_name}</p>
                      <p className="text-xs text-slate-500">{a.action}</p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {a.assignment_date ? format(new Date(a.assignment_date), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance History */}
          {maintenanceLogs.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Maintenance History
              </h4>
              <div className="space-y-2">
                {maintenanceLogs.slice(0, 5).map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm capitalize">{m.maintenance_type}</p>
                      <p className="text-xs text-slate-500">{m.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        m.status === 'completed' ? 'bg-green-100 text-green-700' :
                        m.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {m.status}
                      </Badge>
                      {m.cost && <p className="text-sm font-medium mt-1">₹{m.cost.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {asset.notes && (
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Notes</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{asset.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
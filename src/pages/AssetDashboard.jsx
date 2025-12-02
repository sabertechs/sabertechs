import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, addDays, isBefore } from "date-fns";
import {
  Monitor,
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  Laptop,
  Smartphone,
  Armchair,
  Server,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

export default function AssetDashboard() {
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['assetRequests'],
    queryFn: () => base44.entities.AssetRequest.filter({ status: 'pending' }),
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['maintenancePending'],
    queryFn: () => base44.entities.MaintenanceLog.filter({ status: 'in_progress' }),
  });

  // Calculate stats
  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    inRepair: assets.filter(a => a.status === 'in_repair').length,
    retired: assets.filter(a => a.status === 'retired').length,
    pendingRequests: requests.length,
    pendingMaintenance: maintenance.length
  };

  // Warranty expiring in 30 days
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const warrantyExpiring = assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const expiry = new Date(a.warranty_expiry);
    return isBefore(expiry, thirtyDaysFromNow) && isBefore(today, expiry);
  });

  // Category distribution
  const categoryStats = assets.reduce((acc, asset) => {
    acc[asset.category] = (acc[asset.category] || 0) + 1;
    return acc;
  }, {});

  // Total asset value
  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

  // Calculate current book value (depreciation)
  const calculateBookValue = (asset) => {
    if (!asset.purchase_date || !asset.purchase_cost) return asset.purchase_cost || 0;
    const purchaseDate = new Date(asset.purchase_date);
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

  const totalBookValue = assets.reduce((sum, a) => sum + calculateBookValue(a), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Management</h2>
          <p className="text-slate-500">Track and manage company assets</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("AssetList")}>
            <Button variant="outline">View All Assets</Button>
          </Link>
          <Link to={createPageUrl("AssetList") + "?action=add"}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">+ Add Asset</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Total Assets</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Package className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Available</p>
                <p className="text-3xl font-bold mt-1">{stats.available}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Assigned</p>
                <p className="text-3xl font-bold mt-1">{stats.assigned}</p>
              </div>
              <Monitor className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">In Repair</p>
                <p className="text-3xl font-bold mt-1">{stats.inRepair}</p>
              </div>
              <Wrench className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={createPageUrl("AssetList")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Package className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
              <p className="font-medium text-slate-800">All Assets</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("AssetRequests")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <p className="font-medium text-slate-800">Requests</p>
              {stats.pendingRequests > 0 && (
                <Badge className="mt-2 bg-amber-100 text-amber-700">{stats.pendingRequests} pending</Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("AssetMaintenance")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Wrench className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="font-medium text-slate-800">Maintenance</p>
              {stats.pendingMaintenance > 0 && (
                <Badge className="mt-2 bg-purple-100 text-purple-700">{stats.pendingMaintenance} active</Badge>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("AssetReports")}>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-slate-800">Reports</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Value */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Asset Valuation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm text-slate-500">Total Purchase Value</p>
                <p className="text-2xl font-bold text-slate-800">₹{totalValue.toLocaleString()}</p>
              </div>
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
              <div>
                <p className="text-sm text-green-600">Current Book Value</p>
                <p className="text-2xl font-bold text-green-700">₹{Math.round(totalBookValue).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-300" />
            </div>
            <div className="text-sm text-slate-500 text-center">
              Total Depreciation: ₹{Math.round(totalValue - totalBookValue).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([category, count]) => {
                const Icon = categoryIcons[category] || Package;
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{category}</span>
                        <span className="text-sm text-slate-500">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
              {Object.keys(categoryStats).length === 0 && (
                <p className="text-center text-slate-400 py-4">No assets added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warranty Expiring Soon */}
      {warrantyExpiring.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Warranty Expiring Soon
            </CardTitle>
            <Link to={createPageUrl("AssetList") + "?filter=warranty_expiring"}>
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {warrantyExpiring.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      {React.createElement(categoryIcons[asset.category] || Package, { className: "w-5 h-5 text-amber-600" })}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{asset.name}</p>
                      <p className="text-sm text-slate-500">{asset.asset_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-amber-100 text-amber-700">
                      Expires {format(new Date(asset.warranty_expiry), 'MMM d, yyyy')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Assets */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recently Added Assets</CardTitle>
          <Link to={createPageUrl("AssetList")}>
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p>No assets added yet</p>
              <Link to={createPageUrl("AssetList") + "?action=add"}>
                <Button className="mt-4" variant="outline">Add First Asset</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-sm font-medium text-slate-500">Asset</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Category</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.slice(0, 5).map((asset) => {
                    const Icon = categoryIcons[asset.category] || Package;
                    return (
                      <tr key={asset.id} className="border-b border-slate-50">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{asset.name}</p>
                              <p className="text-sm text-slate-500">{asset.asset_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 capitalize text-slate-600">{asset.category}</td>
                        <td className="py-4">
                          <Badge className={
                            asset.status === 'available' ? 'bg-green-100 text-green-700' :
                            asset.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                            asset.status === 'in_repair' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {asset.status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 text-slate-600">{asset.assigned_to_name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
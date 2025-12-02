import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, isBefore } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Download,
  Package,
  TrendingDown,
  AlertTriangle,
  Wrench,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AssetReports() {
  const [reportType, setReportType] = useState("overview");

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.Asset.list(),
  });

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ['maintenanceLogs'],
    queryFn: () => base44.entities.MaintenanceLog.list(),
  });

  // Category distribution
  const categoryData = Object.entries(
    assets.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Status distribution
  const statusData = Object.entries(
    assets.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' ').charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), value }));

  // Depreciation calculation
  const calculateDepreciation = (asset) => {
    if (!asset.purchase_date || !asset.purchase_cost) return { original: 0, current: 0, depreciation: 0 };
    const purchaseDate = new Date(asset.purchase_date);
    const today = new Date();
    const yearsOwned = (today - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
    const usefulLife = asset.useful_life_years || 5;
    const salvage = asset.salvage_value || 0;
    
    let currentValue;
    if (asset.depreciation_method === 'reducing_balance') {
      const rate = 1 - Math.pow(salvage / asset.purchase_cost, 1 / usefulLife);
      currentValue = Math.max(salvage, asset.purchase_cost * Math.pow(1 - rate, yearsOwned));
    } else {
      const annualDep = (asset.purchase_cost - salvage) / usefulLife;
      currentValue = Math.max(salvage, asset.purchase_cost - (annualDep * yearsOwned));
    }
    
    return {
      original: asset.purchase_cost,
      current: Math.round(currentValue),
      depreciation: Math.round(asset.purchase_cost - currentValue)
    };
  };

  // Warranty expiring
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const warrantyExpiring = assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const expiry = new Date(a.warranty_expiry);
    return isBefore(expiry, thirtyDaysFromNow) && isBefore(today, expiry);
  });

  // Maintenance cost by category
  const maintenanceCostByCategory = {};
  maintenanceLogs.forEach(log => {
    if (log.cost) {
      const asset = assets.find(a => a.id === log.asset_id);
      const category = asset?.category || 'other';
      maintenanceCostByCategory[category] = (maintenanceCostByCategory[category] || 0) + log.cost;
    }
  });
  const maintenanceCostData = Object.entries(maintenanceCostByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Totals
  const totalPurchaseValue = assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + calculateDepreciation(a).current, 0);
  const totalDepreciation = totalPurchaseValue - totalCurrentValue;
  const totalMaintenanceCost = maintenanceLogs.reduce((sum, l) => sum + (l.cost || 0), 0);

  // Export to CSV
  const exportCSV = () => {
    let csvContent = "";
    
    if (reportType === "overview" || reportType === "valuation") {
      csvContent = "Asset ID,Name,Category,Status,Purchase Date,Purchase Cost,Current Value,Depreciation,Warranty Expiry,Assigned To\n";
      assets.forEach(a => {
        const dep = calculateDepreciation(a);
        csvContent += `${a.asset_id},${a.name},${a.category},${a.status},${a.purchase_date || ''},${a.purchase_cost || ''},${dep.current},${dep.depreciation},${a.warranty_expiry || ''},${a.assigned_to_name || ''}\n`;
      });
    } else if (reportType === "maintenance") {
      csvContent = "Asset Name,Type,Vendor,Cost,Start Date,End Date,Status\n";
      maintenanceLogs.forEach(l => {
        csvContent += `${l.asset_name},${l.maintenance_type},${l.vendor_name || ''},${l.cost || ''},${l.start_date || ''},${l.end_date || ''},${l.status}\n`;
      });
    } else if (reportType === "warranty") {
      csvContent = "Asset ID,Name,Category,Warranty Expiry,Days Remaining,Assigned To\n";
      warrantyExpiring.forEach(a => {
        const daysRemaining = Math.ceil((new Date(a.warranty_expiry) - today) / (24 * 60 * 60 * 1000));
        csvContent += `${a.asset_id},${a.name},${a.category},${a.warranty_expiry},${daysRemaining},${a.assigned_to_name || ''}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset_report_${reportType}_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Asset Reports</h2>
          <p className="text-slate-500">Analytics and insights for your assets</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="valuation">Valuation</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="warranty">Warranty</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{assets.length}</p>
                <p className="text-sm text-slate-500">Total Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">₹{(totalCurrentValue / 100000).toFixed(1)}L</p>
                <p className="text-sm text-slate-500">Current Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{warrantyExpiring.length}</p>
                <p className="text-sm text-slate-500">Warranty Expiring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Wrench className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">₹{totalMaintenanceCost.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Maintenance Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Depreciation Summary */}
      {reportType === "valuation" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Depreciation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-sm text-slate-500">Total Purchase Value</p>
                <p className="text-2xl font-bold text-slate-800">₹{totalPurchaseValue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <p className="text-sm text-green-600">Current Book Value</p>
                <p className="text-2xl font-bold text-green-700">₹{totalCurrentValue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-sm text-red-600">Total Depreciation</p>
                <p className="text-2xl font-bold text-red-700">₹{totalDepreciation.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-500">Asset</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Purchase Cost</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Current Value</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Depreciation</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.slice(0, 10).map(asset => {
                    const dep = calculateDepreciation(asset);
                    return (
                      <tr key={asset.id} className="border-b border-slate-100">
                        <td className="p-3">
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-slate-500">{asset.asset_id}</p>
                        </td>
                        <td className="p-3 text-right">₹{dep.original.toLocaleString()}</td>
                        <td className="p-3 text-right text-green-600">₹{dep.current.toLocaleString()}</td>
                        <td className="p-3 text-right text-red-600">₹{dep.depreciation.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warranty Expiring */}
      {reportType === "warranty" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Warranties Expiring in 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warrantyExpiring.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No warranties expiring soon
              </div>
            ) : (
              <div className="space-y-3">
                {warrantyExpiring.map(asset => {
                  const daysRemaining = Math.ceil((new Date(asset.warranty_expiry) - today) / (24 * 60 * 60 * 1000));
                  return (
                    <div key={asset.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-800">{asset.name}</p>
                        <p className="text-sm text-slate-500">{asset.asset_id} • {asset.assigned_to_name || 'Unassigned'}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-amber-100 text-amber-700">
                          {daysRemaining} days left
                        </Badge>
                        <p className="text-sm text-slate-500 mt-1">
                          {format(new Date(asset.warranty_expiry), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance Cost Report */}
      {reportType === "maintenance" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Maintenance Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceCostData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                No maintenance data available
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
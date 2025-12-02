import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Package,
  Laptop,
  Smartphone,
  Monitor,
  Armchair,
  Server,
  FileText,
  Calendar,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function MyAssets() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: assets = [] } = useQuery({
    queryKey: ['myAssets', user?.email],
    queryFn: () => base44.entities.Asset.filter({ assigned_to_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: assignmentHistory = [] } = useQuery({
    queryKey: ['myAssignmentHistory', user?.email],
    queryFn: () => base44.entities.AssetAssignment.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Assets</h2>
        <p className="text-slate-500">Assets currently assigned to you</p>
      </div>

      {/* Assigned Assets */}
      {assets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p>No assets currently assigned to you</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const Icon = categoryIcons[asset.category] || Package;
            const warrantyExpiring = asset.warranty_expiry && new Date(asset.warranty_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            return (
              <Card key={asset.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className="w-7 h-7 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{asset.name}</h3>
                      <p className="text-sm text-slate-500">{asset.asset_id}</p>
                      <Badge className="mt-2 capitalize">{asset.category}</Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    {asset.serial_number && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>SN: {asset.serial_number}</span>
                      </div>
                    )}
                    {asset.location && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{asset.location}</span>
                      </div>
                    )}
                    {asset.assigned_date && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Assigned: {format(new Date(asset.assigned_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  {warrantyExpiring && (
                    <div className="mt-4 p-2 bg-amber-50 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Warranty expires {format(new Date(asset.warranty_expiry), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assignment History */}
      {assignmentHistory.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Assignment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignmentHistory.slice(0, 10).map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{record.asset_name}</p>
                    <p className="text-sm text-slate-500 capitalize">{record.action}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      record.action === 'assigned' ? 'border-green-300 text-green-700' :
                      record.action === 'returned' ? 'border-amber-300 text-amber-700' :
                      'border-blue-300 text-blue-700'
                    }>
                      {record.action}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      {record.assignment_date ? format(new Date(record.assignment_date), 'MMM d, yyyy') : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
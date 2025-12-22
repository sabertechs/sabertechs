import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProjectApplicationsTab({ projectId, applications, status }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ProjectApplication.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectApplications']);
      toast.success('Application status updated');
    }
  });

  const updateRatingMutation = useMutation({
    mutationFn: ({ id, rating }) => base44.entities.ProjectApplication.update(id, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectApplications']);
    }
  });

  const filteredApplications = applications.filter(app => 
    app.freelancer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.freelancer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Project Application List</h3>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">STATUS</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">NAME</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">EMAIL</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">PHONE NUMBER</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">RATING</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">CREATED AT</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-500">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Badge className={
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-medium">{app.freelancer_name}</td>
                    <td className="px-4 py-4 text-slate-600">{app.freelancer_email}</td>
                    <td className="px-4 py-4 text-slate-600">{app.freelancer_phone || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => updateRatingMutation.mutate({ id: app.id, rating: star })}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                app.rating && star <= app.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {app.created_date ? format(new Date(app.created_date), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'accepted' })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'rejected' })}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
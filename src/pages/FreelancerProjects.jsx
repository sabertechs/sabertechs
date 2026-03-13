import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, IndianRupee, Users, CheckCircle, Clock, ListTodo } from "lucide-react";
import { toast } from "sonner";
import FreelancerTasksView from "@/components/projects/FreelancerTasksView";

export default function FreelancerProjects() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'open' }, '-created_date'),
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications', user?.email],
    queryFn: () => base44.entities.ProjectApplication.filter({ freelancer_email: user?.email }),
    enabled: !!user?.email,
  });

  const acceptedProjectIds = myApplications
    .filter(a => a.status === 'accepted')
    .map(a => a.project_id);

  const applyMutation = useMutation({
    mutationFn: async (project) => {
      const employees = await base44.entities.Employee.filter({ email: user.email });
      const employee = employees[0];
      
      // Validate state match
      if (!employee?.state) {
        throw new Error('Please update your profile with your state information before applying.');
      }
      
      if (employee.state !== project.location) {
        throw new Error(`Location mismatch: This project is for ${project.location} but your registered state is ${employee.state}. You can only apply for projects in your registered state.`);
      }
      
      return base44.entities.ProjectApplication.create({
        project_id: project.id,
        project_name: project.name,
        freelancer_email: user.email,
        freelancer_name: user.full_name,
        freelancer_phone: employee?.phone || '',
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myApplications']);
      toast.success('Application submitted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to apply');
    }
  });

  const hasApplied = (projectId) => {
    return myApplications.some(app => app.project_id === projectId);
  };

  const getApplicationStatus = (projectId) => {
    const app = myApplications.find(app => app.project_id === projectId);
    return app?.status;
  };

  const isApplicationOpen = (project) => {
    const now = new Date();
    return isAfter(now, new Date(project.application_start_date)) && 
           isBefore(now, new Date(project.application_end_date));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">Projects</h1>
        <p className="text-blue-100 text-sm">Browse, apply & submit tasks</p>
      </div>

      <div className="p-4">
        <Tabs defaultValue="browse">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="browse" className="flex-1">Browse Projects</TabsTrigger>
            <TabsTrigger value="mytasks" className="flex-1">
              <ListTodo className="w-4 h-4 mr-1" />
              My Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <div className="space-y-4">
              {projects.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No active projects at the moment</p>
                </Card>
              ) : (
                projects.map((project) => {
                  const applied = hasApplied(project.id);
                  const appStatus = getApplicationStatus(project.id);
                  const isOpen = isApplicationOpen(project);

                  return (
                    <Card key={project.id} className="border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{project.name}</h3>
                            <div className="flex flex-wrap gap-2">
                              {project.priority === 'high' && (
                                <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                              )}
                              <Badge className="bg-blue-100 text-blue-700">{project.status}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span>{project.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <IndianRupee className="w-4 h-4 flex-shrink-0" />
                            <span className="font-semibold">₹{project.payout?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}</span>
                          </div>
                          {project.total_slots && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="w-4 h-4 flex-shrink-0" />
                              <span>{project.filled_slots || 0}/{project.total_slots} slots filled</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-4 line-clamp-3">{project.description}</p>

                        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs">
                          <p className="text-slate-500 font-medium mb-1">Application Period</p>
                          <p className="text-slate-700">
                            {format(new Date(project.application_start_date), 'MMM d, h:mm a')} - {format(new Date(project.application_end_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>

                        {applied ? (
                          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-100">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium">
                              {appStatus === 'accepted' ? 'Application Accepted' :
                               appStatus === 'rejected' ? 'Application Rejected' :
                               'Application Submitted'}
                            </span>
                          </div>
                        ) : isOpen ? (
                          <Button
                            onClick={() => applyMutation.mutate(project)}
                            disabled={applyMutation.isPending}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                          >
                            {applyMutation.isPending ? 'Applying...' : 'Apply Now'}
                          </Button>
                        ) : (
                          <div className="text-center p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                            Applications {isBefore(new Date(), new Date(project.application_start_date)) ? 'open soon' : 'closed'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="mytasks">
            {acceptedProjectIds.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ListTodo className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>You don't have any accepted projects yet</p>
              </div>
            ) : (
              acceptedProjectIds.map(projectId => {
                const app = myApplications.find(a => a.project_id === projectId);
                return (
                  <div key={projectId} className="mb-6">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-indigo-600" />
                      {app?.project_name || 'Project Tasks'}
                    </h3>
                    <FreelancerTasksView
                      projectId={projectId}
                      userEmail={user?.email}
                      userName={user?.full_name}
                    />
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
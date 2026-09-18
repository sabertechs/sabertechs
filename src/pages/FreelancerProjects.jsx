import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, IndianRupee, Users, CheckCircle, Clock, ListTodo, Search } from "lucide-react";
import { toast } from "sonner";
import FreelancerTasksView from "@/components/projects/FreelancerTasksView";
import { createEntity } from "@/lib/entityMutations";

export default function FreelancerProjects() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  // Fetch the freelancer's own Employee record to read their work_type, which
  // determines which project work_modes they can see and apply to.
  const { data: myEmployee } = useQuery({
    queryKey: ['myEmployeeRecord', user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user?.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const openProjects = allProjects.filter(p => {
    if (p.status !== 'open') return false;
    const myWorkType = myEmployee?.work_type;
    // "both" (or unset) freelancers can see all projects; otherwise only
    // projects whose work_mode matches the freelancer's work_type.
    if (!myWorkType || myWorkType === 'both') return true;
    if (myWorkType === 'online') return p.work_mode === 'online';
    if (myWorkType === 'centre') return p.work_mode === 'centre';
    return true;
  });
  const projects = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return openProjects;
    return openProjects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [openProjects, search]);

  const { data: myApplications = [] } = useQuery({
    queryKey: ['myApplications', user?.email],
    queryFn: () => base44.entities.ProjectApplication.filter({ freelancer_email: user?.email }),
    enabled: !!user?.email,
  });

  const acceptedProjectIds = myApplications
    .filter(a => a.status === 'accepted')
    .map(a => a.project_id)
    .filter(id => {
      const project = allProjects.find(p => p.id === id);
      return project && project.status === 'open';
    });

  const applyMutation = useMutation({
    mutationFn: async (project) => {
      const employees = await base44.entities.Employee.filter({ email: user.email });
      const employee = employees[0];
      
      return createEntity('ProjectApplication', {
        project_id: project.id,
        project_name: project.name,
        freelancer_email: user.email,
        freelancer_name: user.full_name,
        freelancer_phone: employee?.phone || '',
        status: 'pending'
      }, { context: 'self' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myApplications']);
      toast.success('Application submitted successfully!');
    },
    onError: () => {
      toast.error('Failed to apply');
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 md:p-4 sticky top-0 z-10">
        <h1 className="text-lg md:text-xl font-bold">Projects</h1>
        <p className="text-blue-100 text-xs md:text-sm">Browse, apply & submit tasks</p>
      </div>

      <div className="p-3 md:p-4">
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search projects by name, location, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
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
                      <CardContent className="p-3 md:p-4">
                        <div className="flex justify-between items-start mb-2 md:mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base md:text-lg mb-1">{project.name}</h3>
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                              {project.priority === 'high' && (
                                <Badge className="bg-red-100 text-red-700 text-xs">High Priority</Badge>
                              )}
                              <Badge className="bg-blue-100 text-blue-700 text-xs">{project.status}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:gap-y-2 mb-3 md:mb-4 text-xs md:text-sm">
                          <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="truncate">{project.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <IndianRupee className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="font-semibold">₹{project.payout?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                            <span>{format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}</span>
                          </div>
                          {project.total_slots && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                              <span>{project.filled_slots || 0}/{project.total_slots} filled</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4 line-clamp-2 md:line-clamp-3">{project.description}</p>

                        <div className="bg-slate-50 rounded-lg p-2 md:p-3 mb-3 md:mb-4 text-xs">
                          <p className="text-slate-500 font-medium mb-0.5 md:mb-1">Application Period</p>
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
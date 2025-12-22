import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, ListTodo, DollarSign, ArrowLeft } from "lucide-react";
import ProjectApplicationsTab from "@/components/projects/ProjectApplicationsTab";
import ProjectTasksTab from "@/components/projects/ProjectTasksTab";
import ProjectGroupsTab from "@/components/projects/ProjectGroupsTab";
import ProjectResponsesTab from "@/components/projects/ProjectResponsesTab";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProjectDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['projectApplications', projectId],
    queryFn: () => base44.entities.ProjectApplication.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['projectGroups', projectId],
    queryFn: () => base44.entities.ProjectGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['taskResponses', projectId],
    queryFn: () => base44.entities.TaskResponse.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const acceptedCount = applications.filter(a => a.status === 'accepted').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const activeGroups = groups.filter(g => g.status === 'active').length;
  const responsesCount = responses.filter(r => r.status === 'submitted').length;

  if (!project) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to={createPageUrl("ProjectManagement")}>
        <Button variant="outline" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </Link>

      {/* Project Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge className={
                  project.status === 'open' ? 'bg-green-100 text-green-700' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {project.status}
                </Badge>
                {project.priority === 'high' && (
                  <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Supervisor</p>
              <p className="font-medium">{project.supervisor_name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-slate-500">Payout</p>
              <p className="font-medium">₹{project.payout?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="font-medium">{project.location}</p>
            </div>
            <div>
              <p className="text-slate-500">Applications</p>
              <p className="font-medium">
                {format(new Date(project.application_start_date), 'MM/dd/yyyy h:mm a')} - {format(new Date(project.application_end_date), 'MM/dd/yyyy h:mm a')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
            <div>
              <p className="text-slate-500">Start Date</p>
              <p className="font-medium">{format(new Date(project.start_date), 'MM/dd/yyyy')}</p>
            </div>
            <div>
              <p className="text-slate-500">End Date</p>
              <p className="font-medium">{format(new Date(project.end_date), 'MM/dd/yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{applications.length}</p>
                <p className="text-blue-100 text-sm">{acceptedCount} approved, {pendingCount} pending</p>
              </div>
              <Users className="w-12 h-12 opacity-50" />
            </div>
            <p className="mt-2 font-medium">Total Applications</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{activeGroups}</p>
                <p className="text-green-100 text-sm">Active project groups</p>
              </div>
              <CheckCircle className="w-12 h-12 opacity-50" />
            </div>
            <p className="mt-2 font-medium">Groups</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{tasks.length}</p>
                <p className="text-purple-100 text-sm">{responsesCount} responses received</p>
              </div>
              <ListTodo className="w-12 h-12 opacity-50" />
            </div>
            <p className="mt-2 font-medium">Tasks</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">₹0.00</p>
                <p className="text-orange-100 text-sm">0 transactions</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-50" />
            </div>
            <p className="mt-2 font-medium">Payroll</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="accepted">Accepted Applications</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <ProjectApplicationsTab projectId={projectId} applications={applications} status="all" />
        </TabsContent>

        <TabsContent value="accepted">
          <ProjectApplicationsTab projectId={projectId} applications={applications.filter(a => a.status === 'accepted')} status="accepted" />
        </TabsContent>

        <TabsContent value="groups">
          <ProjectGroupsTab projectId={projectId} project={project} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasksTab projectId={projectId} project={project} />
        </TabsContent>

        <TabsContent value="responses">
          <ProjectResponsesTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Payroll management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
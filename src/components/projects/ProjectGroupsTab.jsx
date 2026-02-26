import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function ProjectGroupsTab({ projectId, project }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [managingGroup, setManagingGroup] = useState(null); // group being managed

  const { data: groups = [] } = useQuery({
    queryKey: ['projectGroups', projectId],
    queryFn: () => base44.entities.ProjectGroup.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: acceptedApplications = [] } = useQuery({
    queryKey: ['acceptedApplications', projectId],
    queryFn: () => base44.entities.ProjectApplication.filter({ project_id: projectId, status: 'accepted' }),
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectGroups']);
      setShowDialog(false);
      setGroupName('');
      toast.success('Group created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['projectGroups']);
      toast.success('Group deleted');
    }
  });

  const updateMembersMutation = useMutation({
    mutationFn: ({ id, members }) => base44.entities.ProjectGroup.update(id, { members }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['projectGroups']);
      // Refresh managing group state
      setManagingGroup(prev => prev ? { ...prev, members: vars.members } : null);
      toast.success('Members updated');
    }
  });

  const toggleMember = (email) => {
    if (!managingGroup) return;
    const current = managingGroup.members || [];
    const updated = current.includes(email)
      ? current.filter(e => e !== email)
      : [...current, email];
    const updatedGroup = { ...managingGroup, members: updated };
    setManagingGroup(updatedGroup);
    updateMembersMutation.mutate({ id: managingGroup.id, members: updated });
  };

  const handleCreate = () => {
    createMutation.mutate({
      project_id: projectId,
      group_name: groupName,
      members: [],
      status: 'active'
    });
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Project Groups</h3>
            <Button onClick={() => setShowDialog(true)} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groups.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-slate-500">
                No groups created yet
              </div>
            ) : (
              groups.map((group) => (
                <Card key={group.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{group.group_name}</h4>
                          <p className="text-sm text-slate-500">{group.members?.length || 0} members</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(group.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Badge className={
                      group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }>
                      {group.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Team A"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
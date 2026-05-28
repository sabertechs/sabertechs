import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { addDays } from "date-fns";

export default function AssignChecklistDialog({ employee }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: () => base44.entities.OnboardingTemplate.filter({ is_active: true })
  });

  const assignMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = templates.find(t => t.id === templateId);
      const assignedDate = new Date().toISOString().split('T')[0];
      
      const tasksWithDates = (template.tasks || []).map(task => ({
        ...task,
        due_date: addDays(new Date(employee.date_of_joining || assignedDate), task.due_days).toISOString().split('T')[0],
        is_completed: false,
        completed_date: null,
        notes: ""
      }));

      return base44.entities.OnboardingChecklist.create({
        employee_email: employee.email,
        employee_name: employee.full_name,
        template_id: template.id,
        template_name: template.template_name,
        assigned_date: assignedDate,
        tasks: tasksWithDates,
        progress_percentage: 0,
        status: 'in_progress'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] });
      setOpen(false);
      setSelectedTemplate("");
    }
  });

  const handleAssign = () => {
    if (selectedTemplate) {
      assignMutation.mutate(selectedTemplate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Assign Checklist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Onboarding Checklist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Employee</Label>
            <p className="text-sm font-medium mt-1">{employee.full_name} ({employee.email})</p>
          </div>
          <div>
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name} ({template.tasks.length} tasks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedTemplate || assignMutation.isPending}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign Checklist'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
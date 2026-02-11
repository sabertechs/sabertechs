import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function OnboardingChecklistCard({ checklist, userEmail }) {
  const queryClient = useQueryClient();
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskNotes, setTaskNotes] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingChecklist.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] });
    }
  });

  const toggleTask = (taskId) => {
    const updatedTasks = checklist.tasks.map(task => {
      if (task.task_id === taskId) {
        const isCompleted = !task.is_completed;
        return {
          ...task,
          is_completed: isCompleted,
          completed_date: isCompleted ? new Date().toISOString().split('T')[0] : null,
          notes: isCompleted && expandedTask === taskId ? taskNotes : task.notes
        };
      }
      return task;
    });

    const completedCount = updatedTasks.filter(t => t.is_completed).length;
    const progressPercentage = Math.round((completedCount / updatedTasks.length) * 100);
    const status = progressPercentage === 100 ? 'completed' : 'in_progress';

    updateMutation.mutate({
      id: checklist.id,
      data: {
        tasks: updatedTasks,
        progress_percentage: progressPercentage,
        status
      }
    });

    setExpandedTask(null);
    setTaskNotes("");
  };

  const getCategoryColor = (category) => {
    const colors = {
      paperwork: "bg-blue-100 text-blue-700",
      accounts: "bg-green-100 text-green-700",
      training: "bg-purple-100 text-purple-700",
      equipment: "bg-orange-100 text-orange-700",
      orientation: "bg-pink-100 text-pink-700",
      other: "bg-slate-100 text-slate-700"
    };
    return colors[category] || colors.other;
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && dueDate;
  };

  const completedTasks = checklist.tasks.filter(t => t.is_completed).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            {checklist.template_name}
          </CardTitle>
          <Badge variant={checklist.status === 'completed' ? 'default' : 'secondary'}>
            {checklist.status === 'completed' ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium">{completedTasks} / {checklist.tasks.length} tasks</span>
          </div>
          <Progress value={checklist.progress_percentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklist.tasks.map((task) => (
            <div key={task.task_id} className="border rounded-lg p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => {
                    if (!task.is_completed) {
                      setExpandedTask(task.task_id);
                    } else {
                      toggleTask(task.task_id);
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${task.is_completed ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </p>
                    <Badge className={getCategoryColor(task.category)} variant="secondary">
                      {task.category}
                    </Badge>
                    {task.is_mandatory && <Badge variant="destructive" className="text-xs">Mandatory</Badge>}
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue(task.due_date) && !task.is_completed ? 'text-red-600 font-medium' : ''}`}>
                        {isOverdue(task.due_date) && !task.is_completed ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {task.is_completed && task.completed_date && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed: {format(new Date(task.completed_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                  {task.notes && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                      <p className="text-slate-600"><strong>Notes:</strong> {task.notes}</p>
                    </div>
                  )}
                  {expandedTask === task.task_id && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Add any notes about completing this task (optional)"
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => toggleTask(task.task_id)}>
                          Mark Complete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setExpandedTask(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
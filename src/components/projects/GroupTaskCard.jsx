import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, Image as ImageIcon, MapPin, Hash, Type, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, Upload, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

const taskTypeIcons = {
  file_upload: FileText,
  image_upload: ImageIcon,
  geo_location: MapPin,
  number_entry: Hash,
  text_entry: Type
};

export default function GroupTaskCard({ taskGroup, groupName, responses, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const firstTask = taskGroup[0];
  const total = taskGroup.length;

  const getMemberStatus = (task) => {
    const taskResponses = responses
      .filter(r => r.task_id === task.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    if (taskResponses.length === 0)
      return { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock };
    const latest = taskResponses[0];
    if (latest.status === 'approved')
      return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (latest.status === 'resubmit_required')
      return { label: 'Resubmit Required', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    return { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Upload };
  };

  const memberStatuses = taskGroup.map(t => ({ task: t, ...getMemberStatus(t) }));
  const completed = memberStatuses.filter(m => m.label === 'Completed').length;
  const submitted = memberStatuses.filter(m => m.label === 'Submitted').length;
  const resubmit = memberStatuses.filter(m => m.label === 'Resubmit Required').length;
  const pending = memberStatuses.filter(m => m.label === 'Pending').length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const isOverdue = firstTask.due_date && new Date(firstTask.due_date) < new Date() && completed < total;
  const Icon = taskTypeIcons[firstTask.task_type] || FileText;

  const priorityColor = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  }[firstTask.priority] || 'bg-yellow-100 text-yellow-700';

  return (
    <div className={`border rounded-lg overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
            <Icon className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold">{firstTask.title}</h4>
                  <Badge className="bg-purple-100 text-purple-700">Group: {groupName}</Badge>
                  {isOverdue && <Badge className="bg-red-500 text-white">Overdue</Badge>}
                </div>
                {firstTask.description && <p className="text-sm text-slate-600 mb-2">{firstTask.description}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{firstTask.task_type.replace('_', ' ')}</Badge>
                  <Badge className={priorityColor}>{firstTask.priority}</Badge>
                  {firstTask.is_required && <Badge className="bg-red-100 text-red-700">Required</Badge>}
                  {firstTask.due_date && (
                    <Badge variant="outline" className={isOverdue ? 'border-red-500 text-red-700' : ''}>
                      Due: {format(new Date(firstTask.due_date), 'MMM d')}
                    </Badge>
                  )}
                </div>

                {/* Summary */}
                <div className="flex flex-wrap gap-3 mb-3 text-sm">
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" /> {completed} completed
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 font-medium">
                    <Upload className="w-4 h-4" /> {submitted} submitted
                  </span>
                  {resubmit > 0 && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertCircle className="w-4 h-4" /> {resubmit} resubmit
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-4 h-4" /> {pending} pending
                  </span>
                  <span className="text-slate-400">· {total} members</span>
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Completion</span>
                    <span className={`font-semibold ${progress === 100 ? 'text-green-600' : 'text-indigo-600'}`}>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                  {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {expanded ? 'Hide' : 'Members'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(taskGroup)} title="Edit all">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(taskGroup.map(t => t.id))} className="text-red-500" title="Delete all">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded member list */}
      {expanded && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3">
          <div className="space-y-2">
            {memberStatuses.map(({ task, label, color, icon: StatusIcon }) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
                    {(task.assigned_to_name || task.assigned_to || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{task.assigned_to_name || task.assigned_to}</p>
                    <p className="text-xs text-slate-500">{task.assigned_to}</p>
                  </div>
                </div>
                <Badge className={color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {label}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
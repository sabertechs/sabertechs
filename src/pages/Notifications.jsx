import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, Check, CheckCheck, Trash2, Info, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Notification.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  });

  const markAsRead = (id) => {
    updateMutation.mutate({ id, data: { is_read: true } });
  };

  const markAllAsRead = async () => {
    for (const notif of notifications.filter(n => !n.is_read)) {
      await base44.entities.Notification.update(notif.id, { is_read: true });
    }
    queryClient.invalidateQueries(['notifications']);
  };

  const typeIcons = {
    info: Info,
    approval: Clock,
    deadline: AlertCircle,
    alert: AlertCircle,
    success: CheckCircle
  };

  const typeColors = {
    info: 'bg-blue-100 text-blue-600',
    approval: 'bg-amber-100 text-amber-600',
    deadline: 'bg-orange-100 text-orange-600',
    alert: 'bg-red-100 text-red-600',
    success: 'bg-green-100 text-green-600'
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
          <p className="text-slate-500">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800">No Notifications</h3>
              <p className="text-slate-500 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => {
                const IconComponent = typeIcons[notif.type] || Info;
                return (
                  <div 
                    key={notif.id} 
                    className={`p-4 flex items-start gap-4 transition-colors ${!notif.is_read ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`p-3 rounded-xl ${typeColors[notif.type] || typeColors.info}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">{notif.message}</p>
                        </div>
                        {!notif.is_read && (
                          <Badge className="bg-indigo-100 text-indigo-700 shrink-0">New</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-slate-400">
                          {format(new Date(notif.created_date), 'MMM d, yyyy h:mm a')}
                        </span>
                        <div className="flex gap-2">
                          {!notif.is_read && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs"
                              onClick={() => markAsRead(notif.id)}
                            >
                              <Check className="w-3 h-3 mr-1" /> Mark Read
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs text-red-500 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(notif.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
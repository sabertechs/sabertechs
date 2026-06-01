import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Megaphone,
  Briefcase,
  PartyPopper,
  Cake,
  Award,
  MessageCircle,
  Send,
  Plus,
  Loader2,
  Upload,
  X,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const postTypeConfig = {
  update: { icon: Megaphone, color: "bg-blue-100 text-blue-600", label: "Update" },
  opening: { icon: Briefcase, color: "bg-green-100 text-green-600", label: "Job Opening" },
  celebration: { icon: PartyPopper, color: "bg-purple-100 text-purple-600", label: "Celebration" },
  birthday: { icon: Cake, color: "bg-pink-100 text-pink-600", label: "Birthday" },
  anniversary: { icon: Award, color: "bg-amber-100 text-amber-600", label: "Work Anniversary" }
};

export default function CompanyFeedPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    post_type: "update",
    image_url: "",
    employee_email: "",
    event_date: ""
  });

  React.useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchUser();
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['companyPosts'],
    queryFn: () => base44.entities.CompanyPost.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['postComments'],
    queryFn: () => base44.entities.PostComment.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const isHR = employee?.role === 'hr' || employee?.role === 'manager' || employee?.role === 'department_head' || user?.role === 'admin';

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' }),
    enabled: isHR,
    staleTime: 10 * 60 * 1000,
  });

  // Auto-generate birthday and anniversary posts
  React.useEffect(() => {
    if (!isHR || employees.length === 0 || posts.length === 0) return;
    
    const today = format(new Date(), 'MM-dd');
    const checkAndCreatePost = async () => {
      for (const emp of employees) {
        // Check birthday
        if (emp.date_of_birth) {
          const dobMMDD = emp.date_of_birth.slice(5); // Get MM-DD
          if (dobMMDD === today) {
            const existingBirthday = posts.find(p => 
              p.post_type === 'birthday' && 
              p.employee_email === emp.email &&
              p.event_date === format(new Date(), 'yyyy-MM-dd')
            );
            if (!existingBirthday) {
              await base44.entities.CompanyPost.create({
                title: `🎂 Happy Birthday ${emp.full_name}!`,
                content: `Wishing you a wonderful birthday filled with joy and happiness!`,
                post_type: 'birthday',
                employee_email: emp.email,
                employee_name: emp.full_name,
                event_date: format(new Date(), 'yyyy-MM-dd')
              });
              queryClient.invalidateQueries(['companyPosts']);
            }
          }
        }
        
        // Check work anniversary
        if (emp.date_of_joining) {
          const dojMMDD = emp.date_of_joining.slice(5); // Get MM-DD
          const joiningYear = parseInt(emp.date_of_joining.slice(0, 4));
          const currentYear = new Date().getFullYear();
          const yearsCompleted = currentYear - joiningYear;
          
          if (dojMMDD === today && yearsCompleted > 0) {
            const existingAnniversary = posts.find(p => 
              p.post_type === 'anniversary' && 
              p.employee_email === emp.email &&
              p.event_date === format(new Date(), 'yyyy-MM-dd')
            );
            if (!existingAnniversary) {
              await base44.entities.CompanyPost.create({
                title: `🎉 Happy ${yearsCompleted} Year Work Anniversary ${emp.full_name}!`,
                content: `Congratulations on completing ${yearsCompleted} year${yearsCompleted > 1 ? 's' : ''} with us! Thank you for your dedication and hard work.`,
                post_type: 'anniversary',
                employee_email: emp.email,
                employee_name: emp.full_name,
                event_date: format(new Date(), 'yyyy-MM-dd')
              });
              queryClient.invalidateQueries(['companyPosts']);
            }
          }
        }
      }
    };
    
    checkAndCreatePost();
  }, [employees, posts, isHR]);

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companyPosts']);
      setShowCreateDialog(false);
      resetForm();
      toast.success("Post created successfully!");
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, comment, isWish }) => {
      await base44.entities.PostComment.create({
        post_id: postId,
        commenter_email: user?.email,
        commenter_name: user?.full_name,
        comment,
        is_wish: isWish
      });
      const post = posts.find(p => p.id === postId);
      if (post) {
        await base44.entities.CompanyPost.update(postId, {
          comments_count: (post.comments_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['postComments']);
      queryClient.invalidateQueries(['companyPosts']);
      setCommentText("");
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      post_type: "update",
      image_url: "",
      employee_email: "",
      event_date: ""
    });
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (err) {
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  const handleCreatePost = () => {
    const emp = employees.find(e => e.email === formData.employee_email);
    createPostMutation.mutate({
      ...formData,
      employee_name: emp?.full_name || ""
    });
  };

  const getCommentsForPost = (postId) => allComments.filter(c => c.post_id === postId);

  const handleSubmitComment = (postId, postType) => {
    if (!commentText.trim()) return;
    const isWish = postType === 'birthday' || postType === 'anniversary';
    addCommentMutation.mutate({ postId, comment: commentText, isWish });
  };

  const filteredPosts = typeFilter === "all" 
    ? posts 
    : posts.filter(p => p.post_type === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Company Feed</h2>
          <p className="text-slate-500">Updates, celebrations & announcements</p>
        </div>
        {isHR && (
          <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button 
          variant={typeFilter === "all" ? "default" : "outline"} 
          size="sm"
          onClick={() => setTypeFilter("all")}
        >
          All
        </Button>
        {Object.entries(postTypeConfig).map(([type, config]) => (
          <Button
            key={type}
            variant={typeFilter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(type)}
            className="gap-1"
          >
            <config.icon className="w-4 h-4" />
            {config.label}
          </Button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filteredPosts.map((post) => {
          const config = postTypeConfig[post.post_type] || postTypeConfig.update;
          const Icon = config.icon;
          const comments = getCommentsForPost(post.id);
          const isExpanded = expandedPost === post.id;
          const isCelebration = post.post_type === 'birthday' || post.post_type === 'anniversary';

          return (
            <Card key={post.id} className="border-0 shadow-sm">
              <CardContent className="pt-6">
                {/* Post Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`p-3 rounded-xl ${config.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={config.color}>{config.label}</Badge>
                      {post.is_pinned && <Badge variant="outline">📌 Pinned</Badge>}
                      <span className="text-sm text-slate-400">
                        {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">{post.title}</h3>
                  </div>
                </div>

                {/* Post Content */}
                {post.content && (
                  <p className="text-slate-600 mb-4 whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Employee Info for Birthday/Anniversary */}
                {isCelebration && post.employee_name && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-amber-50 rounded-xl mb-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xl">
                        {post.employee_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold text-slate-800">{post.employee_name}</p>
                      {post.event_date && (
                        <p className="text-slate-500">{format(new Date(post.event_date), 'MMMM d, yyyy')}</p>
                      )}
                    </div>
                    <div className="ml-auto text-4xl">
                      {post.post_type === 'birthday' ? '🎂' : '🎉'}
                    </div>
                  </div>
                )}

                {/* Image */}
                {post.image_url && (
                  <img 
                    src={post.image_url} 
                    alt={post.title} 
                    className="w-full max-h-80 object-cover rounded-xl mb-4"
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <button 
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{comments.length} {isCelebration ? 'Wishes' : 'Comments'}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Existing Comments */}
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-sm bg-slate-200">
                            {comment.commenter_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-700">{comment.commenter_name}</p>
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-slate-600">{comment.comment}</p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm bg-indigo-100 text-indigo-600">
                          {user?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder={isCelebration ? "Send your wishes... 🎉" : "Write a comment..."}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id, post.post_type)}
                        />
                        <Button 
                          className="bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleSubmitComment(post.id, post.post_type)}
                          disabled={addCommentMutation.isPending}
                        >
                          {addCommentMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredPosts.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No posts found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Post Type</Label>
              <Select value={formData.post_type} onValueChange={(v) => setFormData(prev => ({ ...prev, post_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(postTypeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter post title"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your post content..."
                rows={4}
              />
            </div>

            {(formData.post_type === 'birthday' || formData.post_type === 'anniversary') && (
              <>
                <div className="space-y-2">
                  <Label>Select Employee *</Label>
                  <Select 
                    value={formData.employee_email} 
                    onValueChange={(v) => {
                      const emp = employees.find(e => e.email === v);
                      if (emp) {
                        const eventDate = formData.post_type === 'birthday' 
                          ? emp.date_of_birth 
                          : emp.date_of_joining;
                        setFormData(prev => ({ 
                          ...prev, 
                          employee_email: v,
                          event_date: eventDate || ''
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.email} value={emp.email}>
                          {emp.full_name} 
                          {formData.post_type === 'birthday' && emp.date_of_birth && ` (DOB: ${emp.date_of_birth})`}
                          {formData.post_type === 'anniversary' && emp.date_of_joining && ` (Joined: ${emp.date_of_joining})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Event Date (Auto-filled from employee data)</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                    readOnly
                    className="bg-slate-50"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              {formData.image_url ? (
                <div className="relative">
                  <img src={formData.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-indigo-300">
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <span className="text-slate-500">Upload image</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePost}
              disabled={!formData.title || createPostMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Briefcase,
  PartyPopper,
  Cake,
  Award,
  MessageCircle,
  Send,
  Heart,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const postTypeConfig = {
  update: { icon: Megaphone, color: "bg-blue-100 text-blue-600", label: "Update" },
  opening: { icon: Briefcase, color: "bg-green-100 text-green-600", label: "Job Opening" },
  celebration: { icon: PartyPopper, color: "bg-purple-100 text-purple-600", label: "Celebration" },
  birthday: { icon: Cake, color: "bg-pink-100 text-pink-600", label: "Birthday" },
  anniversary: { icon: Award, color: "bg-amber-100 text-amber-600", label: "Work Anniversary" }
};

export default function CompanyFeed({ user, limit = 5 }) {
  const queryClient = useQueryClient();
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentText, setCommentText] = useState("");

  const { data: posts = [] } = useQuery({
    queryKey: ['companyPosts'],
    queryFn: () => base44.entities.CompanyPost.list('-created_date', limit),
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['postComments'],
    queryFn: () => base44.entities.PostComment.list('-created_date'),
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
      // Update comment count
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

  const getCommentsForPost = (postId) => allComments.filter(c => c.post_id === postId);

  const handleSubmitComment = (postId, postType) => {
    if (!commentText.trim()) return;
    const isWish = postType === 'birthday' || postType === 'anniversary';
    addCommentMutation.mutate({ postId, comment: commentText, isWish });
  };

  if (posts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Company Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p>No updates yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-600" />
          Company Feed
        </CardTitle>
        <Link to={createPageUrl("CompanyFeed")}>
          <Button variant="ghost" size="sm">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => {
          const config = postTypeConfig[post.post_type] || postTypeConfig.update;
          const Icon = config.icon;
          const comments = getCommentsForPost(post.id);
          const isExpanded = expandedPost === post.id;
          const isCelebration = post.post_type === 'birthday' || post.post_type === 'anniversary';

          return (
            <div key={post.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
              {/* Post Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={config.color}>{config.label}</Badge>
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 mt-1">{post.title}</h4>
                </div>
              </div>

              {/* Post Content */}
              {post.content && (
                <p className="text-slate-600 text-sm mb-3">{post.content}</p>
              )}

              {/* Employee Info for Birthday/Anniversary */}
              {isCelebration && post.employee_name && (
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-amber-50 rounded-lg mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                      {post.employee_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-800">{post.employee_name}</p>
                    {post.event_date && (
                      <p className="text-xs text-slate-500">{format(new Date(post.event_date), 'MMMM d')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Image */}
              {post.image_url && (
                <img 
                  src={post.image_url} 
                  alt={post.title} 
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2 border-t">
                <button 
                  onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length} {isCelebration ? 'Wishes' : 'Comments'}</span>
                </button>
              </div>

              {/* Comments Section */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  {/* Existing Comments */}
                  {comments.slice(0, 5).map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-slate-200">
                          {comment.commenter_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-slate-50 rounded-lg p-2">
                        <p className="text-xs font-medium text-slate-700">{comment.commenter_name}</p>
                        <p className="text-sm text-slate-600">{comment.comment}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                        {user?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Input
                        placeholder={isCelebration ? "Send your wishes..." : "Write a comment..."}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id, post.post_type)}
                      />
                      <Button 
                        size="sm" 
                        className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700"
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Doc, Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SequenceReviewProps {
  campaignId: Id<"campaigns">;
}

export function SequenceReview({ campaignId }: SequenceReviewProps) {
  const campaign = useQuery(api.campaigns.getCampaignById, { campaignId });
  const posts = useQuery(api.posts.getPostsForCampaign, { campaignId });
  const publishCampaign = useMutation(api.posts.publishCampaignSequence);
  const [publishing, setPublishing] = useState(false);

  if (!campaign || !posts) {
    return <div className="text-center text-gray-500">Loading...</div>;
  }

  if (!campaign.campaign) {
    return <div className="text-center text-gray-500">Campaign not found</div>;
  }

  const allApproved =
    posts.length > 0 && posts.every((p) => p.status === "APPROVED");
  const isPublished = campaign.campaign.status === "PUBLISHED";

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishCampaign({ campaignId });
      toast.success("Campaign published!");
    } catch {
      toast.error("Failed to publish campaign");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{campaign.campaign.title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Campaign status: <Badge className="ml-2">{campaign.campaign.status}</Badge>
        </p>
      </div>

      {isPublished && (
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            ✓ Campaign published! All posts are now live.
          </p>
        </div>
      )}

      {allApproved && !isPublished && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 flex items-center justify-between">
          <p className="text-sm font-medium text-green-900">
            ✓ All posts approved! Ready to publish.
          </p>
          <Button onClick={handlePublish} disabled={publishing} size="sm">
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {publishing ? "Publishing…" : "Publish campaign"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">No posts generated yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                campaignId={campaignId}
                isPublished={isPublished}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PostCardProps {
  post: Doc<"posts">;
  campaignId: Id<"campaigns">;
  isPublished: boolean;
}

function PostCard({ post, isPublished }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedMediaDesc, setEditedMediaDesc] = useState(post.mediaDescription || "");
  const [isLoading, setIsLoading] = useState(false);

  const updatePost = useMutation(api.posts.updatePost);
  const approvePost = useMutation(api.posts.approvePost);
  const rejectPost = useMutation(api.posts.rejectPost);
  const regenerateMutation = useAction(api.postActions.regeneratePost);

  const handleSaveEdits = async () => {
    setIsLoading(true);
    try {
      await updatePost({
        postId: post._id,
        content: editedContent !== post.content ? editedContent : undefined,
        mediaDescription:
          editedMediaDesc !== (post.mediaDescription || "")
            ? editedMediaDesc
            : undefined,
      });
      setIsEditing(false);
      toast.success("Post updated");
    } catch {
      toast.error("Failed to update post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await approvePost({ postId: post._id });
      toast.success("Post approved");
    } catch {
      toast.error("Failed to approve post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await rejectPost({ postId: post._id });
      toast.success("Post rejected");
    } catch {
      toast.error("Failed to reject post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      await regenerateMutation({ postId: post._id });
      toast.success("Post regenerated");
      setIsEditing(false);
    } catch {
      toast.error("Failed to regenerate post");
    } finally {
      setIsLoading(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    DRAFT: "bg-gray-100",
    APPROVED: "bg-green-50",
    REJECTED: "bg-red-50",
  };
  const statusColor = statusColorMap[post.status] || "bg-gray-100";

  return (
    <div className={`rounded-lg border p-4 ${statusColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2">
          <Badge variant="outline">{post.platform}</Badge>
          <Badge variant="secondary">{post.contentType}</Badge>
        </div>
        <Badge
          className={
            post.status === "APPROVED"
              ? "bg-green-600"
              : post.status === "REJECTED"
                ? "bg-red-600"
                : "bg-gray-600"
          }
        >
          {post.status}
        </Badge>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              className="w-full min-h-24 rounded border p-2 text-sm"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Media Description</label>
            <textarea
              className="w-full min-h-16 rounded border p-2 text-sm"
              value={editedMediaDesc}
              onChange={(e) => setEditedMediaDesc(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdits}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save edits
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditedContent(post.content);
                setEditedMediaDesc(post.mediaDescription || "");
                setIsEditing(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          </div>
          {post.mediaDescription && (
            <div className="mb-3 rounded bg-white/50 p-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Media:</span> {post.mediaDescription}
              </p>
            </div>
          )}
          {isPublished && post.mockPublishedUrl && (
            <div className="mb-3 rounded bg-white/50 p-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Published URL (mock):</span>{" "}
                {post.mockPublishedUrl}
              </p>
              {post.publishedAt && (
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold">Published:</span>{" "}
                  {new Date(post.publishedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {!isPublished && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={isLoading || post.status === "APPROVED"}
              >
                Edit
              </Button>
              {post.status === "DRAFT" && (
                <>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRegenerate}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerate
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

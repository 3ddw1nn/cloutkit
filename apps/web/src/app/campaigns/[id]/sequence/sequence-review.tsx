"use client";

import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@cloutkit/backend/convex/_generated/api";
import type { Doc, Id } from "@cloutkit/backend/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Upload } from "lucide-react";
import { toast } from "sonner";

interface SequenceReviewProps {
  campaignId: Id<"campaigns">;
}

export function SequenceReview({ campaignId }: SequenceReviewProps) {
  const campaign = useQuery(api.campaigns.getCampaignById, { campaignId });
  const posts = useQuery(api.posts.getPostsForCampaign, { campaignId });
  const publishCampaign = useAction(api.postPublishActions.publishCampaignSequence);
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
      const result = await publishCampaign({ campaignId });
      toast.success(`Campaign published! ${result.successCount} posts.`);
      if (result.failures.length > 0) {
        toast.error(`${result.failures.length} post(s) failed to publish.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish campaign";
      toast.error(message);
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
  post: Doc<"posts"> & { mediaUrl: string | null };
  campaignId: Id<"campaigns">;
  isPublished: boolean;
}

function PostCard({ post, isPublished }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [editedMediaDesc, setEditedMediaDesc] = useState(post.mediaDescription || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const updatePost = useMutation(api.posts.updatePost);
  const approvePost = useMutation(api.posts.approvePost);
  const rejectPost = useMutation(api.posts.rejectPost);
  const regenerateMutation = useAction(api.postActions.regeneratePost);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const attachMedia = useMutation(api.posts.attachMediaToPost);
  const generateImage = useAction(api.postMediaActions.generatePostImage);

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
            {post.platform === "X" && (
              <p className={`text-xs mt-2 ${post.content.length > 280 ? "text-red-600" : "text-gray-500"}`}>
                {post.content.length} / 280 characters
              </p>
            )}
          </div>
          {post.mediaDescription && (
            <div className="mb-3 rounded bg-white/50 p-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Media:</span> {post.mediaDescription}
              </p>
            </div>
          )}

          {(post.platform === "INSTAGRAM" || post.platform === "YOUTUBE") && (
            <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3">
              {post.mediaUrl ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">
                    {post.platform === "YOUTUBE" ? "Video attached:" : "Image attached:"}
                  </p>
                  {post.platform === "YOUTUBE" ? (
                    <video src={post.mediaUrl} controls className="h-32 w-48 rounded" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.mediaUrl} alt="Post" className="h-32 w-32 rounded object-cover" />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">
                    {post.platform === "YOUTUBE"
                      ? "Video required for YouTube posting"
                      : "Image required for Instagram posting"}
                  </p>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept={post.platform === "YOUTUBE" ? "video/*" : "image/*"}
                        disabled={isUploadingMedia}
                        onChange={async (e) => {
                          const file = e.currentTarget.files?.[0];
                          if (!file) return;
                          setIsUploadingMedia(true);
                          try {
                            const url = await generateUploadUrl();
                            const uploadResponse = await fetch(url, {
                              method: "POST",
                              body: file,
                            });
                            const { storageId } = (await uploadResponse.json()) as {
                              storageId: string;
                            };
                            await attachMedia({ postId: post._id, storageId: storageId as Id<"_storage"> });
                            toast.success(
                              post.platform === "YOUTUBE" ? "Video uploaded" : "Image uploaded",
                            );
                          } catch {
                            toast.error("Failed to upload media");
                          } finally {
                            setIsUploadingMedia(false);
                          }
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUploadingMedia}
                        onClick={(e) => {
                          e.currentTarget.parentElement
                            ?.querySelector('input[type="file"]')
                            ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                        }}
                      >
                        {isUploadingMedia ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1 h-3 w-3" />
                            Upload
                          </>
                        )}
                      </Button>
                    </label>
                    {post.platform === "INSTAGRAM" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isGeneratingImage || !post.mediaDescription}
                      onClick={async () => {
                        setIsGeneratingImage(true);
                        try {
                          await generateImage({ postId: post._id });
                          toast.success("Image generated");
                        } catch (error) {
                          const message =
                            error instanceof Error ? error.message : "Failed to generate image";
                          toast.error(message);
                        } finally {
                          setIsGeneratingImage(false);
                        }
                      }}
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-1 h-3 w-3" />
                          Generate
                        </>
                      )}
                    </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isPublished && post.mockPublishedUrl && (
            <div className="mb-3 rounded bg-white/50 p-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Published URL</span>{" "}
                <span className="text-gray-500">
                  {post.publishMethod === "REAL" ? "(live)" : "(mock)"}
                </span>
                : {post.mockPublishedUrl}
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
                    disabled={
                      isLoading ||
                      ((post.platform === "INSTAGRAM" || post.platform === "YOUTUBE") &&
                        !post.mediaUrl)
                    }
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

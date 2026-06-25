"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Doc } from "@cloutkit/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface OpportunityCardProps {
  opportunity: Doc<"engagementOpportunities">;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onSaveText: (proposedText: string) => Promise<void>;
}

export function OpportunityCard({
  opportunity,
  onApprove,
  onReject,
  onSaveText,
}: OpportunityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(opportunity.proposedText || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveText = async () => {
    setIsLoading(true);
    try {
      await onSaveText(editedText);
      setIsEditing(false);
      toast.success("Text updated");
    } catch {
      toast.error("Failed to update text");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove();
      toast.success("Opportunity approved");
    } catch {
      toast.error("Failed to approve");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject();
      toast.success("Opportunity rejected");
    } catch {
      toast.error("Failed to reject");
    } finally {
      setIsLoading(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    PENDING: "bg-yellow-50",
    APPROVED: "bg-green-50",
    REJECTED: "bg-red-50",
  };
  const statusColor = statusColorMap[opportunity.status] || "bg-gray-50";

  const scheduledTime = new Date(opportunity.scheduledFor).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-lg border p-4 ${statusColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{opportunity.platform}</Badge>
          <Badge variant="secondary">{opportunity.actionType}</Badge>
          <Badge variant="outline">{opportunity.targetType}</Badge>
        </div>
        <Badge
          className={
            opportunity.status === "APPROVED"
              ? "bg-green-600"
              : opportunity.status === "REJECTED"
                ? "bg-red-600"
                : "bg-yellow-600"
          }
        >
          {opportunity.status}
        </Badge>
      </div>

      <div className="mb-3 text-sm space-y-1">
        <p>
          <span className="font-medium">Target: </span>
          {opportunity.targetHandle}
          {opportunity.targetFollowerCount && (
            <span className="text-gray-600 text-xs ml-1">
              ({opportunity.targetFollowerCount.toLocaleString()} followers)
            </span>
          )}
        </p>
        {opportunity.targetPostSnippet && (
          <p>
            <span className="font-medium">Post: </span>
            <span className="text-gray-700 italic">&ldquo;{opportunity.targetPostSnippet}&rdquo;</span>
          </p>
        )}
        <p>
          <span className="font-medium">Scheduled: </span>
          {scheduledTime}
        </p>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Proposed text</label>
            <textarea
              className="w-full min-h-16 rounded border p-2 text-sm"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveText} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditedText(opportunity.proposedText || "");
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
          {opportunity.proposedText && (
            <div className="mb-3 rounded bg-white/50 p-2">
              <p className="text-sm text-gray-700">&ldquo;{opportunity.proposedText}&rdquo;</p>
            </div>
          )}
          {opportunity.status === "PENDING" && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                Edit
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={isLoading}>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

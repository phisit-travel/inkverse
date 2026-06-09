"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Heart, ChevronDown, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import clsx from "clsx";

interface Comment {
  id: string;
  content: string;
  isSpoiler: boolean;
  likes: number;
  createdAt: string | Date;
  user: {
    username: string;
    avatarUrl?: string | null;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  chapterId: string;
  comments?: Comment[];
  currentUserId?: string;
}

function CommentItem({
  comment,
  depth = 0,
}: {
  comment: Comment;
  depth?: number;
}) {
  const [spoilerVisible, setSpoilerVisible] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className={clsx("flex gap-3", depth > 0 && "ml-8 mt-3")}>
      <div className="relative w-8 h-8 flex-shrink-0 rounded-full overflow-hidden bg-[#1a1e2a]">
        {comment.user.avatarUrl ? (
          <Image
            src={comment.user.avatarUrl}
            alt={comment.user.username}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gradient-to-br from-[#ff2d55]/20 to-[#ff6b2b]/20">
            {comment.user.username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white">
            {comment.user.username}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
              locale: th,
            })}
          </span>
          {comment.isSpoiler && (
            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <AlertTriangle className="w-3 h-3" />
              สปอยล์
            </span>
          )}
        </div>

        {comment.isSpoiler && !spoilerVisible ? (
          <button
            onClick={() => setSpoilerVisible(true)}
            className="text-sm text-gray-500 italic hover:text-gray-300 transition-colors"
          >
            คลิกเพื่อดูความคิดเห็นที่มีสปอยล์
          </button>
        ) : (
          <p className="text-sm text-gray-300 leading-relaxed">
            {comment.content}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#ff2d55] transition-colors">
            <Heart className="w-3.5 h-3.5" />
            {comment.likes}
          </button>
          <button className="text-xs text-gray-500 hover:text-white transition-colors">
            ตอบกลับ
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-[#ff6b2b] hover:text-[#ff2d55] transition-colors"
            >
              <ChevronDown
                className={clsx(
                  "w-3.5 h-3.5 transition-transform",
                  showReplies && "rotate-180"
                )}
              />
              {comment.replies.length} การตอบกลับ
            </button>

            {showReplies &&
              comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentSection({
  chapterId,
  comments = [],
  currentUserId,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUserId) return;

    setSubmitting(true);
    try {
      await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, content, isSpoiler }),
      });
      setContent("");
      setIsSpoiler(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10">
      <h3 className="flex items-center gap-2 font-bebas text-xl text-white tracking-wider mb-4">
        <MessageCircle className="w-5 h-5 text-[#ff2d55]" />
        ความคิดเห็น ({comments.length})
      </h3>

      {currentUserId && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="แสดงความคิดเห็น..."
            rows={3}
            className="w-full bg-[#1a1e2a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#ff2d55]/50 transition-colors"
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="accent-[#ff2d55]"
              />
              มีสปอยล์
            </label>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#ff2d55] to-[#ff6b2b] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {submitting ? "กำลังส่ง..." : "ส่ง"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </section>
  );
}

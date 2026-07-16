"use client";

import { useMemo, useState } from "react";
import { Search, Bug, MessageSquare, Send, Loader2, Image as ImageIcon, X } from "lucide-react";

type FeedbackItem = {
  id: string;
  source: "telegram" | "platform";
  type: "feedback" | "report";
  displayName: string | null;
  telegramId: string | null;
  message: string;
  photoUrl: string | null;
  replyMessage: string | null;
  replyPhotoUrl: string | null;
  repliedAt: string | null;
  createdAt: string;
};

type Filter = "all" | "feedback" | "report";

function senderLabel(item: FeedbackItem) {
  const parts: string[] = [];
  if (item.displayName) parts.push(item.displayName);
  if (item.telegramId) parts.push(`Telegram ID ${item.telegramId}`);
  return parts.length ? parts.join(" · ") : "Unknown sender";
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState(item.replyMessage);
  const [lastReplyPhoto, setLastReplyPhoto] = useState(item.replyPhotoUrl);
  const [lastRepliedAt, setLastRepliedAt] = useState(item.repliedAt);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
  }

  async function sendReply() {
    if (!reply.trim() && !file) return;
    setSending(true);
    setError(null);

    try {
      let photoUrl: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/feedback/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Photo upload failed.");
        photoUrl = uploadData.url;
      }

      const res = await fetch(`/api/admin/feedback/${item.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply, photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send reply.");

      setLastReply(reply.trim() || "[Photo attached]");
      setLastReplyPhoto(photoUrl ?? null);
      setLastRepliedAt(new Date().toISOString());
      setReply("");
      clearFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send reply.");
    } finally {
      setSending(false);
    }
  }

  const isReport = item.type === "report";

  return (
    <div className="rounded-2xl border border-bp-border bg-bp-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
            isReport ? "bg-bp-danger/15 text-bp-danger" : "bg-bp-accent/15 text-bp-accent"
          }`}
        >
          {isReport ? <Bug className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
          {isReport ? "Problem Report" : "Feedback"}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-white/40 capitalize">
          {item.source}
        </span>
        <span className="text-white/35">{senderLabel(item)}</span>
        <span className="ml-auto text-white/30">{new Date(item.createdAt).toLocaleString()}</span>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-white">{item.message}</p>

      {item.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.photoUrl} alt="Attachment" className="mt-2 max-h-48 rounded-lg border border-bp-border" />
      )}

      {lastReply && (
        <div className="mt-3 rounded-lg border border-bp-success/20 bg-bp-success/10 p-2.5 text-xs text-white/70">
          <span className="font-bold text-bp-success">You replied</span>
          {lastRepliedAt && <span className="text-white/35"> · {new Date(lastRepliedAt).toLocaleString()}</span>}
          <p className="mt-1 whitespace-pre-wrap">{lastReply}</p>
          {lastReplyPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lastReplyPhoto} alt="Reply attachment" className="mt-1.5 max-h-32 rounded-lg border border-bp-border" />
          )}
        </div>
      )}

      {item.telegramId ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a reply…"
              className="flex-1 rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendReply();
              }}
            />
            <button
              onClick={sendReply}
              disabled={sending || (!reply.trim() && !file)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-3 py-2 text-sm font-bold text-[#06243c] disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {preview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Attachment preview" className="max-h-24 rounded-lg border border-bp-border" />
              <button
                type="button"
                onClick={clearFile}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bp-danger text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-bp-border px-2.5 py-1.5 text-xs text-white/50 hover:text-white">
              <ImageIcon className="h-3.5 w-3.5" />
              Attach a photo (optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/30">No linked Telegram account — can&rsquo;t reply.</p>
      )}

      {error && <p className="mt-1.5 text-xs text-bp-danger">{error}</p>}
    </div>
  );
}

export function FeedbackInbox({ items }: { items: FeedbackItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.type !== filter) return false;
      if (!q) return true;
      return (
        (i.displayName ?? "").toLowerCase().includes(q) ||
        (i.telegramId ?? "").toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sender or message…"
            className="w-full rounded-lg border border-bp-border bg-bp-bg py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "report", "feedback"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-gradient-to-r from-bp-accent to-[#0098e0] text-[#06243c]"
                  : "border border-bp-border text-white/60 hover:text-white"
              }`}
            >
              {f === "report" ? "Problem Reports" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-white/40">No submissions yet.</p>
        )}
        {filtered.map((item) => (
          <FeedbackRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

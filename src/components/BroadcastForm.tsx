"use client";

import { useState } from "react";
import { Image as ImageIcon, X, Link as LinkIcon } from "lucide-react";

export function BroadcastForm() {
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send this message to every Telegram user? This can't be undone.`)) return;

    setSending(true);
    setError(null);
    setResult(null);

    try {
      let photoUrl: string | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/admin/broadcast/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || "Image upload failed.");
          setSending(false);
          return;
        }
        photoUrl = uploadData.url;
      }

      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          photoUrl,
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Broadcast failed.");
        return;
      }

      setResult(data);
      setMessage("");
      clearImage();
      setButtonText("");
      setButtonUrl("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        required
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your announcement…"
        className="rounded-lg border border-bp-border bg-bp-bg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
      />
      {imageFile && (
        <p className="text-[11px] text-white/40">
          {message.length}/1024 characters (photo captions are capped shorter than plain text)
        </p>
      )}

      {imagePreview ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Broadcast attachment preview" className="max-h-48 rounded-lg border border-bp-border" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-bp-danger text-white"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-bp-border px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:border-bp-accent/50 hover:text-white">
          <ImageIcon className="h-4 w-4" />
          Attach a photo (optional)
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImagePick} className="hidden" />
        </label>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-bp-border p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
          <LinkIcon className="h-3.5 w-3.5" />
          Link button (optional)
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Button text, e.g. Enroll Now"
            className="flex-1 rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
          />
          <input
            type="url"
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            placeholder="https://…"
            className="flex-1 rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-bp-accent"
          />
        </div>
      </div>

      {error && <p className="text-sm text-bp-danger">{error}</p>}
      {result && (
        <p className="text-sm text-bp-success">
          Sent to {result.sent} of {result.total} users
          {result.failed > 0 ? ` (${result.failed} failed — likely blocked the bot)` : ""}.
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="self-start rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-6 py-2.5 font-bold text-[#06243c] disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send to all Telegram users"}
      </button>
    </form>
  );
}

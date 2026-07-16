"use client";

import { useState } from "react";
import { MessageSquare, Image as ImageIcon, X } from "lucide-react";

type ContactType = "feedback" | "report";

export function ContactForm() {
  const [type, setType] = useState<ContactType>("feedback");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      let photoUrl: string | undefined;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/feedback/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Photo upload failed.");
        photoUrl = uploadData.url;
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send your message.");

      setMessage("");
      clearFile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative rounded-2xl border border-bp-accent/20 bg-gradient-to-br from-bp-accent/10 to-bp-card/70 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <MessageSquare className="h-4 w-4 text-bp-accent" />
        Contact Us
      </div>
      <p className="mt-1 text-xs text-white/45">
        Found a bug, or have an idea? Tell us — it goes straight to the BandPath team.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setType("feedback")}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
            type === "feedback"
              ? "border-bp-accent bg-bp-accent/15 text-bp-accent"
              : "border-bp-border text-white/50 hover:text-white"
          }`}
        >
          💬 Feedback
        </button>
        <button
          type="button"
          onClick={() => setType("report")}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
            type === "report"
              ? "border-bp-danger bg-bp-danger/15 text-bp-danger"
              : "border-bp-border text-white/50 hover:text-white"
          }`}
        >
          🐛 Report a Problem
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Type your message here…"
          className="w-full resize-none rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-sm text-white outline-none focus:border-bp-accent"
        />

        {preview ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Attachment preview" className="max-h-32 rounded-lg border border-bp-border" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bp-danger text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-bp-border px-3 py-1.5 text-xs text-white/50 hover:text-white">
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

        <button
          type="submit"
          disabled={saving || !message.trim()}
          className="self-start rounded-lg bg-gradient-to-r from-bp-accent to-[#0098e0] px-5 py-2 text-sm font-bold text-[#06243c] disabled:opacity-50"
        >
          {saving ? "Sending…" : "Send"}
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-bp-danger">{error}</p>}
      {saved && <p className="mt-2 text-xs text-bp-success">Message sent — thank you!</p>}
    </div>
  );
}

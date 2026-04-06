import React, { useState } from "react";
import { Copy, Check, Mail, Pencil, X, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface EmailVariant {
  label: string;
  subject: string;
  body: string;
}

interface EmailVariantCardProps {
  variants: EmailVariant[];
  messageIndex: number;
  conversationId: string | null;
}

const CRUD_API = import.meta.env.VITE_CRUD_API as string | undefined;

const EmailVariantCard: React.FC<EmailVariantCardProps> = ({ variants, messageIndex, conversationId }) => {
  const { user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [editedVariants, setEditedVariants] = useState<EmailVariant[]>(variants);

  const selected = editedVariants[selectedIndex];

  const handleCopy = async () => {
    const text = `Subject: ${selected.subject}\n\n${selected.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInMail = () => {
    const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(selected.subject)}&body=${encodeURIComponent(selected.body)}`;
    window.open(mailto, "_blank");
  };

  const handleSubjectChange = (value: string) => {
    setEditedVariants((prev) =>
      prev.map((v, i) => (i === selectedIndex ? { ...v, subject: value } : v))
    );
  };

  const handleBodyChange = (value: string) => {
    setEditedVariants((prev) =>
      prev.map((v, i) => (i === selectedIndex ? { ...v, body: value } : v))
    );
  };

  const handleReset = () => {
    setEditedVariants(variants);
    setEditing(false);
    setSaveError(null);
  };

  const handleDone = async () => {
    setEditing(false);
    setSaveError(null);

    if (!conversationId || !user || !CRUD_API) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(CRUD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          token,
          action: "saveEmailEdits",
          conversationId,
          messageIndex,
          variants: editedVariants,
        }),
      });

      if (!response.ok) {
        setSaveError("Failed to save edits.");
      }
    } catch (e) {
      setSaveError("Failed to save edits.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="self-start mr-auto w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-accent">
          <Mail size={14} className="stroke-textdark" />
        </div>
        <span className="text-sm font-medium text-textdark">Email Draft</span>
        <span className="text-xs text-textsecondary">— pick a tone that works for you</span>
      </div>

      {/* Card */}
      <div className="bg-innercontainer border border-border rounded-lg overflow-hidden">
        {/* Variant Tab Selector */}
        <div className="flex border-b border-border bg-bglight px-4 pt-3 gap-2">
          {editedVariants.map((variant, i) => (
            <button
              key={variant.label}
              onClick={() => setSelectedIndex(i)}
              className={`relative px-4 py-2 text-sm rounded-t-md transition-colors duration-150 font-medium ${
                selectedIndex === i
                  ? "bg-innercontainer text-textdark border border-b-0 border-border -mb-px"
                  : "text-textsecondary hover:text-textdark hover:bg-secondary"
              }`}
            >
              <span className="mr-1.5 text-xs font-bold opacity-50">
                {String.fromCharCode(65 + i)}
              </span>
              {variant.label}
            </button>
          ))}
        </div>

        {/* Email Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Recipient */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-textsecondary">
              To
            </span>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="recipient@utdallas.edu"
              className="text-sm text-textdark bg-secondary border border-border px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent w-full placeholder:text-textsecondary"
            />
          </div>

          {/* Subject Line */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-textsecondary">
              Subject
            </span>
            {editing ? (
              <input
                type="text"
                value={selected.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="text-sm text-textdark bg-secondary border border-border px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent w-full"
              />
            ) : (
              <span className="text-sm text-textdark font-medium bg-secondary px-3 py-2 rounded-md">
                {selected.subject}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-textsecondary">
              Body
            </span>
            {editing ? (
              <textarea
                value={selected.body}
                onChange={(e) => handleBodyChange(e.target.value)}
                rows={10}
                className="text-sm text-textdark bg-secondary border border-border px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-accent w-full resize-none leading-relaxed"
                style={{ scrollbarWidth: "none" }}
              />
            ) : (
              <p className="text-sm text-textdark whitespace-pre-wrap leading-relaxed bg-secondary px-3 py-2 rounded-md">
                {selected.body}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-border bg-bglight">
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleDone}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors duration-150 text-sm text-textdark disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin stroke-textdark" />
                  ) : (
                    <Check size={14} className="stroke-textdark" />
                  )}
                  {saving ? "Saving..." : "Done"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors duration-150 text-sm text-textsecondary disabled:opacity-50"
                >
                  <X size={14} />
                  Reset
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors duration-150 text-sm text-textdark"
              >
                <Pencil size={14} className="stroke-textdark" />
                Edit
              </button>
            )}
            {saveError && (
              <span className="text-xs text-destructive">{saveError}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors duration-150 text-sm text-textdark"
            >
              {copied ? (
                <>
                  <Check size={14} className="stroke-textdark" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} className="stroke-textdark" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleOpenInMail}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent hover:bg-buttonhover transition-colors duration-150 text-sm text-textdark font-medium"
            >
              <Send size={14} className="stroke-textdark" />
              Open in mail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVariantCard;
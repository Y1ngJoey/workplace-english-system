"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type EditableTextProps = {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  "aria-label": string;
};

export function EditableText({
  value,
  onSave,
  multiline = false,
  className,
  inputClassName,
  placeholder,
  "aria-label": ariaLabel,
}: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const latestValueRef = useRef(value);

  useEffect(() => {
    setDraft(value);
    latestValueRef.current = value;
  }, [value]);

  async function save() {
    const nextValue = draft.trim();
    if (nextValue === latestValueRef.current) {
      return;
    }
    setSaving(true);
    await onSave(nextValue);
    latestValueRef.current = nextValue;
    setSaving(false);
  }

  const sharedClassName = cn(
    "w-full rounded-2xl border border-transparent bg-transparent transition placeholder:text-slate hover:border-line hover:bg-white/55 focus:border-blue focus:bg-white",
    inputClassName,
  );

  return (
    <div className={cn("relative", className)}>
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          value={draft}
          placeholder={placeholder}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className={cn(sharedClassName, "resize-y px-3 py-2 leading-7")}
        />
      ) : (
        <input
          aria-label={ariaLabel}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          className={cn(sharedClassName, "px-3 py-2")}
        />
      )}
      {saving ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-deep" /> : null}
    </div>
  );
}

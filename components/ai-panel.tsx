"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { generateAiContent, applyAiToResume } from "@/lib/actions/ai";
import type { AiFeature } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedResult {
  feature: AiFeature;
  content: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

interface ResultCardProps {
  result: GeneratedResult;
  onApply: (feature: AiFeature, content: string) => void;
  onDiscard: () => void;
  isApplying: boolean;
  applySuccess: boolean;
}

function ResultCard({
  result,
  onApply,
  onDiscard,
  isApplying,
  applySuccess,
}: ResultCardProps) {
  const featureLabels: Record<AiFeature, string> = {
    summary: "Professional Summary",
    work_experience: "Work Experience",
    cover_letter: "Cover Letter",
  };

  const canApply = result.feature === "summary" || result.feature === "work_experience";

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-accent/20 bg-accent/10">
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm">✦</span>
          <span className="font-sans text-xs font-normal tracking-widest uppercase text-accent">
            AI — {featureLabels[result.feature]}
          </span>
        </div>
        <button
          onClick={onDiscard}
          className="font-sans text-xs text-ink-muted hover:text-ink transition-colors px-2 py-1 rounded"
          aria-label="Discard result"
        >
          Discard ✕
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <pre className="font-sans text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
          {result.content}
        </pre>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex flex-wrap items-center gap-3">
        {/* Copy button — works for all features */}
        <button
          onClick={() => navigator.clipboard.writeText(result.content)}
          className="btn-ghost text-xs px-4 py-2"
        >
          Copy text
        </button>

        {/* Apply to CV — only for summary and work experience */}
        {canApply && (
          <>
            {applySuccess ? (
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-success">
                <span>✓</span> Applied to your CV
              </span>
            ) : (
              <button
                onClick={() => onApply(result.feature, result.content)}
                disabled={isApplying}
                className="btn-accent text-xs px-5 py-2 flex items-center gap-2"
              >
                {isApplying && <Spinner />}
                {isApplying ? "Applying…" : "Apply to CV"}
              </button>
            )}
          </>
        )}

        {result.feature === "cover_letter" && (
          <span className="font-sans text-xs text-ink-muted">
            Copy and paste this into your application.
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main AI Panel Component ──────────────────────────────────────────────────

export default function AiPanel() {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [activeFeature, setActiveFeature] = useState<AiFeature | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Prevent double-clicks: track which feature is currently loading
  const loadingFeatureRef = useRef<AiFeature | null>(null);

  const handleGenerate = useCallback(
    (feature: AiFeature) => {
      // Guard: already loading
      if (isPending || loadingFeatureRef.current) return;

      setError(null);
      setResult(null);
      setApplySuccess(false);
      setActiveFeature(feature);
      loadingFeatureRef.current = feature;

      startTransition(async () => {
        const res = await generateAiContent(feature, jobTitle, companyName);
        loadingFeatureRef.current = null;

        if (res.success && res.content) {
          setResult({ feature, content: res.content });
        } else {
          setError(res.error ?? "Something went wrong. Please try again.");
          setActiveFeature(null);
        }
      });
    },
    [isPending, jobTitle, companyName]
  );

  const handleApply = useCallback(
    async (feature: AiFeature, content: string) => {
      if (feature !== "summary" && feature !== "work_experience") return;
      setIsApplying(true);
      const res = await applyAiToResume(feature, content);
      setIsApplying(false);
      if (res.success) {
        setApplySuccess(true);
      } else {
        setError(res.error ?? "Failed to apply content.");
      }
    },
    []
  );

  const handleDiscard = useCallback(() => {
    setResult(null);
    setActiveFeature(null);
    setApplySuccess(false);
    setError(null);
  }, []);

  const buttons: { feature: AiFeature; label: string; description: string; icon: string }[] = [
    {
      feature: "summary",
      label: "Generate Summary",
      description: "Write a sharp 3–4 sentence professional summary",
      icon: "✦",
    },
    {
      feature: "work_experience",
      label: "Improve Experience",
      description: "Rewrite bullets with stronger language and metrics",
      icon: "◈",
    },
    {
      feature: "cover_letter",
      label: "Cover Letter",
      description: "Generate a tailored cover letter for this role",
      icon: "◇",
    },
  ];

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-accent">✦</span>
          <h3 className="font-display text-lg text-ink">AI Assistant</h3>
        </div>
        <p className="font-sans text-xs text-ink-muted leading-relaxed">
          Powered by GPT-4o. Enter a job title to personalise the output.
        </p>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label htmlFor="ai-job-title" className="label-text">
            Target job title <span className="text-accent">*</span>
          </label>
          <input
            id="ai-job-title"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Product Manager"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="ai-company" className="label-text">
            Company name <span className="text-ink-muted font-sans normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="ai-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Stripe"
            className="input-field"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        {buttons.map((btn) => {
          const isThisLoading = isPending && activeFeature === btn.feature;
          return (
            <button
              key={btn.feature}
              onClick={() => handleGenerate(btn.feature)}
              disabled={isPending || !jobTitle.trim()}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all duration-150 text-left
                ${
                  isPending && activeFeature === btn.feature
                    ? "border-accent/40 bg-accent/10 cursor-wait"
                    : "border-paper-border bg-paper hover:border-ink/30 hover:bg-paper-warm cursor-pointer"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-accent mt-0.5 shrink-0 text-sm">
                {isThisLoading ? <Spinner /> : btn.icon}
              </span>
              <span>
                <span className="block font-sans text-sm text-ink">
                  {isThisLoading ? "Generating…" : btn.label}
                </span>
                <span className="block font-sans text-xs text-ink-muted mt-0.5">
                  {btn.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* No job title hint */}
      {!jobTitle.trim() && (
        <p className="font-sans text-xs text-ink-muted text-center">
          Enter a job title above to enable AI generation.
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-error text-xs font-sans">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <ResultCard
          result={result}
          onApply={handleApply}
          onDiscard={handleDiscard}
          isApplying={isApplying}
          applySuccess={applySuccess}
        />
      )}

      {/* Disclaimer */}
      <p className="font-sans text-[11px] text-ink-muted/70 leading-relaxed border-t border-paper-border pt-4">
        AI output may be inaccurate. Always review before applying to your CV.
      </p>
    </div>
  );
}

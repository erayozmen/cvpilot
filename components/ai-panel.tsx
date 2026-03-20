"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { generateAiContent, applyAiToResume } from "@/lib/actions/ai";
import type { AiFeature, PlanInfo } from "@/lib/types";
import { FREE_AI_LIMIT } from "@/lib/plan";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface GeneratedResult {
  feature: AiFeature;
  content: string;
}

interface AiPanelProps {
  planInfo?: PlanInfo | null;  // dashboard'dan geçirilebilir, opsiyonel
  resumeId?: string;           // belirli bir CV'ye bağlamak için
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── Sonuç kartı ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  result: GeneratedResult;
  onApply: (feature: AiFeature, content: string) => void;
  onDiscard: () => void;
  onRegenerate: (feature: AiFeature) => void;
  isApplying: boolean;
  applySuccess: boolean;
  isRegenerating: boolean;
}

function ResultCard({
  result,
  onApply,
  onDiscard,
  onRegenerate,
  isApplying,
  applySuccess,
  isRegenerating,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const featureLabels: Record<AiFeature, string> = {
    summary: "Profesyonel Özet",
    work_experience: "İş Deneyimi",
    cover_letter: "Ön Yazı",
  };

  const canApply =
    result.feature === "summary" || result.feature === "work_experience";

  function handleCopy() {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-accent/20 bg-accent/10">
        <div className="flex items-center gap-2">
          <span className="text-accent text-xs">✦</span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-accent">
            AI — {featureLabels[result.feature]}
          </span>
        </div>
        <button
          onClick={onDiscard}
          className="font-sans text-xs text-ink-muted hover:text-ink transition-colors px-2 py-0.5 rounded"
        >
          ✕
        </button>
      </div>

      {/* İçerik */}
      <div className="p-4">
        <pre className="font-sans text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
          {result.content}
        </pre>
      </div>

      {/* Butonlar */}
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        {/* Kopyala */}
        <button
          onClick={handleCopy}
          className="btn-ghost text-xs px-3 py-1.5"
        >
          {copied ? "✓ Kopyalandı" : "Kopyala"}
        </button>

        {/* Yeniden üret */}
        <button
          onClick={() => onRegenerate(result.feature)}
          disabled={isRegenerating}
          className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
        >
          {isRegenerating && <Spinner />}
          {isRegenerating ? "Üretiliyor…" : "Yeniden Üret"}
        </button>

        {/* CV'ye Uygula — sadece özet ve iş deneyimi için */}
        {canApply && (
          <>
            {applySuccess ? (
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-success">
                ✓ CV'ye uygulandı
              </span>
            ) : (
              <button
                onClick={() => onApply(result.feature, result.content)}
                disabled={isApplying}
                className="btn-accent text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isApplying && <Spinner />}
                {isApplying ? "Uygulanıyor…" : "CV'ye Uygula"}
              </button>
            )}
          </>
        )}

        {result.feature === "cover_letter" && (
          <span className="font-sans text-xs text-ink-muted">
            Kopyalayıp başvuru formuna yapıştırabilirsin.
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kullanım göstergesi (panel içi mini versiyon) ────────────────────────────

function UsageBadge({ planInfo }: { planInfo: PlanInfo }) {
  if (planInfo.isProUser) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
        ✦ Pro · Sınırsız
      </span>
    );
  }
  const pct = Math.min(100, (planInfo.aiUsageCount / FREE_AI_LIMIT) * 100);
  const isLow = planInfo.remainingFreeUses <= 1;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 bg-paper-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: isLow ? "#c4423a" : "#c4783a",
          }}
        />
      </div>
      <span className={`font-mono text-[10px] ${isLow ? "text-error" : "text-ink-muted"}`}>
        {planInfo.remainingFreeUses}/{FREE_AI_LIMIT} kaldı
      </span>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function AiPanel({ planInfo, resumeId }: AiPanelProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [activeFeature, setActiveFeature] = useState<AiFeature | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const loadingFeatureRef = useRef<AiFeature | null>(null);

  // Limit dolu mu? (planInfo varsa kontrol et)
  const limitReached = planInfo ? !planInfo.canUseAI : false;

  const handleGenerate = useCallback(
    (feature: AiFeature) => {
      if (isPending || loadingFeatureRef.current) return;
      if (limitReached) return;

      setError(null);
      setResult(null);
      setApplySuccess(false);
      setActiveFeature(feature);
      loadingFeatureRef.current = feature;

      startTransition(async () => {
        const res = await generateAiContent(
          feature,
          jobTitle,
          companyName,
          resumeId
        );
        loadingFeatureRef.current = null;

        if (res.success && res.content) {
          setResult({ feature, content: res.content });
        } else {
          setError(res.error ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
          setActiveFeature(null);
        }
      });
    },
    [isPending, jobTitle, companyName, resumeId, limitReached]
  );

  const handleApply = useCallback(
    async (feature: AiFeature, content: string) => {
      if (feature !== "summary" && feature !== "work_experience") return;
      setIsApplying(true);
      const res = await applyAiToResume(feature, content, resumeId);
      setIsApplying(false);
      if (res.success) {
        setApplySuccess(true);
      } else {
        setError(res.error ?? "İçerik uygulanamadı.");
      }
    },
    [resumeId]
  );

  const handleDiscard = useCallback(() => {
    setResult(null);
    setActiveFeature(null);
    setApplySuccess(false);
    setError(null);
  }, []);

  const buttons: {
    feature: AiFeature;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      feature: "summary",
      label: "Özet Yaz",
      description: "Güçlü 3–4 cümlelik profesyonel özet oluştur",
      icon: "✦",
    },
    {
      feature: "work_experience",
      label: "Deneyimi Güçlendir",
      description: "Bullet point'leri daha etkili hale getir",
      icon: "◈",
    },
    {
      feature: "cover_letter",
      label: "Ön Yazı Oluştur",
      description: "Pozisyona özel kişiselleştirilmiş ön yazı",
      icon: "◇",
    },
  ];

  const isDisabled = isPending || !jobTitle.trim() || limitReached;

  return (
    <div className="card p-5 space-y-4">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-accent text-sm">✦</span>
            <h3 className="font-display text-base text-ink">AI Asistan</h3>
          </div>
          <p className="font-sans text-xs text-ink-muted">
            GPT-4o ile özet, deneyim ve ön yazı üret.
          </p>
        </div>
        {planInfo && <UsageBadge planInfo={planInfo} />}
      </div>

      {/* Limit uyarısı */}
      {limitReached && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 font-sans text-xs text-error">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            Aylık ücretsiz AI limitine ulaştınız.{" "}
            <strong>Pro plana geçerek</strong> sınırsız kullanabilirsiniz.
          </span>
        </div>
      )}

      {/* Giriş alanları */}
      <div className="space-y-2.5">
        <div>
          <label htmlFor="ai-job-title" className="label-text">
            Hedef pozisyon <span className="text-accent">*</span>
          </label>
          <input
            id="ai-job-title"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="örn. Kıdemli Yazılım Mühendisi"
            className="input-field"
            disabled={limitReached}
          />
        </div>
        <div>
          <label htmlFor="ai-company" className="label-text">
            Şirket adı{" "}
            <span className="text-ink-muted font-sans normal-case tracking-normal">
              (opsiyonel)
            </span>
          </label>
          <input
            id="ai-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="örn. Türk Telekom, Trendyol"
            className="input-field"
            disabled={limitReached}
          />
        </div>
      </div>

      {/* Aksiyon butonları */}
      <div className="space-y-2">
        {buttons.map((btn) => {
          const isThisLoading = isPending && activeFeature === btn.feature;
          return (
            <button
              key={btn.feature}
              onClick={() => handleGenerate(btn.feature)}
              disabled={isDisabled}
              className={`w-full flex items-start gap-3 p-3.5 rounded-lg border transition-all duration-150 text-left
                ${isThisLoading
                  ? "border-accent/40 bg-accent/10 cursor-wait"
                  : "border-paper-border bg-paper hover:border-ink/30 hover:bg-paper-warm"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-accent mt-0.5 shrink-0 text-sm">
                {isThisLoading ? <Spinner /> : btn.icon}
              </span>
              <span>
                <span className="block font-sans text-sm text-ink">
                  {isThisLoading ? "Üretiliyor…" : btn.label}
                </span>
                <span className="block font-sans text-xs text-ink-muted mt-0.5">
                  {btn.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Pozisyon girilmemişse ipucu */}
      {!jobTitle.trim() && !limitReached && (
        <p className="font-sans text-xs text-ink-muted text-center">
          Üretim yapmak için hedef pozisyon girin.
        </p>
      )}

      {/* Hata mesajı */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-error text-xs font-sans">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Sonuç kartı */}
      {result && (
        <ResultCard
          result={result}
          onApply={handleApply}
          onDiscard={handleDiscard}
          onRegenerate={handleGenerate}
          isApplying={isApplying}
          applySuccess={applySuccess}
          isRegenerating={isPending && activeFeature === result.feature}
        />
      )}

      {/* Uyarı notu */}
      <p className="font-sans text-[10px] text-ink-muted/60 leading-relaxed border-t border-paper-border pt-3">
        AI çıktıları hatalı olabilir. CV'ye uygulamadan önce gözden geçirin.
      </p>
    </div>
  );
}

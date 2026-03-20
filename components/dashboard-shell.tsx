"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ResumeData, PlanInfo } from "@/lib/types";
import { deleteResume, duplicateResume } from "@/lib/actions/resume";
import { getPlanBadge, FREE_AI_LIMIT } from "@/lib/plan";
import AiPanel from "@/components/ai-panel";
import UpgradeButton from "@/components/upgrade-button";

interface DashboardShellProps {
  user: User;
  resumes: ResumeData[];
  planInfo: PlanInfo | null;
  upgradeStatus?: string | null;
}

// ─── Tarih formatlama ─────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── CV tamamlanma yüzdesi ────────────────────────────────────────────────────

const completionKeys: (keyof ResumeData)[] = [
  "full_name", "email", "phone", "location",
  "linkedin", "summary", "work_experience", "education", "skills",
];

function getCompletion(resume: ResumeData): number {
  const filled = completionKeys.filter((k) => {
    const v = resume[k];
    return typeof v === "string" && v.trim().length > 0;
  }).length;
  return Math.round((filled / completionKeys.length) * 100);
}

// ─── Silme onay modalı ────────────────────────────────────────────────────────

interface DeleteModalProps {
  resumeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({ resumeTitle, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Arka plan */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal kutusu */}
      <div className="relative card p-8 max-w-sm w-full shadow-card-hover">
        <div className="text-2xl mb-4">⚠</div>
        <h3 className="font-display text-xl text-ink mb-2">CV Silinecek</h3>
        <p className="font-sans text-sm text-ink-muted mb-6 leading-relaxed">
          <strong className="text-ink">&ldquo;{resumeTitle}&rdquo;</strong> adlı
          CV kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="btn-ghost flex-1 py-2.5"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white font-sans text-sm transition-all hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Siliniyor…" : "Evet, Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CV Detay Modalı ─────────────────────────────────────────────────────────

interface ViewModalProps {
  resume: ResumeData;
  onClose: () => void;
}

function ViewModal({ resume, onClose }: ViewModalProps) {
  const sections = [
    { label: "Ad Soyad", value: resume.full_name },
    { label: "E-posta", value: resume.email },
    { label: "Telefon", value: resume.phone },
    { label: "Konum", value: resume.location },
    { label: "LinkedIn", value: resume.linkedin },
    { label: "Özet", value: resume.summary },
    { label: "İş Deneyimi", value: resume.work_experience },
    { label: "Eğitim", value: resume.education },
    { label: "Beceriler", value: resume.skills },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative card max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-card-hover">
        {/* Başlık */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-paper-border">
          <div>
            <h3 className="font-display text-xl text-ink">
              {resume.title || "İsimsiz CV"}
            </h3>
            <p className="font-sans text-xs text-ink-muted mt-0.5">
              Oluşturulma: {formatDate(resume.created_at)} · Güncelleme: {formatDate(resume.updated_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-border/60 transition-colors"
          >
            ✕
          </button>
        </div>
        {/* İçerik */}
        <div className="overflow-y-auto px-8 py-6 space-y-5">
          {sections.map((s) =>
            s.value ? (
              <div key={s.label}>
                <p className="label-text mb-1">{s.label}</p>
                <p className="font-sans text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {s.value}
                </p>
              </div>
            ) : null
          )}
        </div>
        {/* Alt butonlar */}
        <div className="px-8 py-5 border-t border-paper-border flex justify-end gap-3">
          <Link
            href={`/resume-preview?id=${resume.id}`}
            className="btn-ghost text-sm px-5 py-2.5"
          >
            Önizle
          </Link>
          <Link
            href={`/cv-builder?id=${resume.id}`}
            className="btn-primary text-sm px-5 py-2.5"
          >
            Düzenle
          </Link>
          <button onClick={onClose} className="btn-ghost text-sm px-5 py-2.5">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tek CV Kartı ─────────────────────────────────────────────────────────────

interface ResumeCardProps {
  resume: ResumeData;
  onDelete: (resume: ResumeData) => void;
  onView: (resume: ResumeData) => void;
  isDuplicating: boolean;
  onDuplicate: (id: string) => void;
}

function ResumeCard({ resume, onDelete, onView, isDuplicating, onDuplicate }: ResumeCardProps) {
  const pct = getCompletion(resume);

  return (
    <div className="card p-6 flex flex-col gap-4 hover:shadow-card-hover transition-shadow duration-200">
      {/* Üst satır */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base text-ink truncate">
            {resume.title || "İsimsiz CV"}
          </h3>
          <p className="font-sans text-xs text-ink-muted mt-0.5">
            {resume.full_name || "—"}
          </p>
        </div>
        <span
          className="shrink-0 font-mono text-xs px-2 py-0.5 rounded-full border"
          style={{
            color: pct === 100 ? "#2d7a4f" : pct > 50 ? "#c4783a" : "#6b6b8a",
            borderColor: pct === 100 ? "#2d7a4f40" : pct > 50 ? "#c4783a40" : "#e8e5de",
            background: pct === 100 ? "#2d7a4f10" : pct > 50 ? "#c4783a10" : "transparent",
          }}
        >
          %{pct}
        </span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="h-1 w-full bg-paper-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "#2d7a4f" : pct > 50 ? "#c4783a" : "#1a1a2e",
          }}
        />
      </div>

      {/* Tarihler */}
      <div className="flex gap-4 font-sans text-xs text-ink-muted">
        <span>📅 Oluşturulma: {formatDate(resume.created_at)}</span>
        {resume.updated_at && resume.updated_at !== resume.created_at && (
          <span>✎ Güncelleme: {formatDate(resume.updated_at)}</span>
        )}
      </div>

      {/* Aksiyonlar */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-paper-border">
        <Link
          href={`/cv-builder?id=${resume.id}`}
          className="btn-primary text-xs px-4 py-2"
        >
          Düzenle
        </Link>
        <Link
          href={`/resume-preview?id=${resume.id}`}
          className="btn-ghost text-xs px-4 py-2"
        >
          Önizle
        </Link>
        <button
          onClick={() => onView(resume)}
          className="btn-ghost text-xs px-4 py-2"
        >
          Detay
        </button>
        <button
          onClick={() => onDuplicate(resume.id!)}
          disabled={isDuplicating}
          className="btn-ghost text-xs px-4 py-2 disabled:opacity-50"
        >
          {isDuplicating ? "Kopyalanıyor…" : "Çoğalt"}
        </button>
        <button
          onClick={() => onDelete(resume)}
          className="text-xs px-4 py-2 rounded-lg font-sans text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
        >
          Sil
        </button>
      </div>
    </div>
  );
}

// ─── Ana Dashboard Bileşeni ───────────────────────────────────────────────────

export default function DashboardShell({ user, resumes, planInfo, upgradeStatus }: DashboardShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ResumeData | null>(null);
  const [viewTarget, setViewTarget] = useState<ResumeData | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const firstName = resumes[0]?.full_name
    ? resumes[0].full_name.split(" ")[0]
    : user.email?.split("@")[0] ?? "there";

  // Bildirim göster ve 3 sn sonra kaldır
  function showMsg(type: "success" | "error", text: string) {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3000);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget?.id) return;
    startTransition(async () => {
      const res = await deleteResume(deleteTarget.id!);
      setDeleteTarget(null);
      if (res.success) {
        showMsg("success", "CV başarıyla silindi.");
        router.refresh();
      } else {
        showMsg("error", res.error ?? "Silme işlemi başarısız.");
      }
    });
  }

  async function handleDuplicate(id: string) {
    if (isDuplicating) return;
    setIsDuplicating(true);
    const res = await duplicateResume(id);
    setIsDuplicating(false);
    if (res.success) {
      showMsg("success", "CV kopyası oluşturuldu.");
      router.refresh();
    } else {
      showMsg("error", res.error ?? "Kopyalama başarısız.");
    }
  }

  return (
    <main className="page-container py-12 md:py-16">

      {/* Upgrade banner */}
      {upgradeStatus === "success" && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200 font-sans text-sm text-amber-800">
          <span className="text-lg">✦</span>
          <div>
            <strong className="font-sans">Pro plana hoş geldiniz!</strong>
            <span className="ml-1">Artık sınırsız AI üretimi kullanabilirsiniz.</span>
          </div>
        </div>
      )}
      {upgradeStatus === "cancel" && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-paper border border-paper-border font-sans text-sm text-ink-muted">
          <span>◇</span>
          <span>Ödeme iptal edildi. İstediğin zaman tekrar deneyebilirsin.</span>
        </div>
      )}

      {/* Toast bildirimi */}
      {actionMsg && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-card-hover font-sans text-sm transition-all ${
            actionMsg.type === "success"
              ? "bg-green-50 border border-green-200 text-success"
              : "bg-red-50 border border-red-200 text-error"
          }`}
        >
          <span>{actionMsg.type === "success" ? "✓" : "⚠"}</span>
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Silme onay modalı */}
      {deleteTarget && (
        <DeleteModal
          resumeTitle={deleteTarget.title || "İsimsiz CV"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isPending}
        />
      )}

      {/* CV detay modalı */}
      {viewTarget && (
        <ViewModal
          resume={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {/* ── Karşılama ── */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-ink-muted tracking-widest uppercase mb-2">
            Dashboard
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-ink">
            Merhaba, {firstName} 👋
          </h1>
        </div>
        <Link href="/cv-builder" className="btn-primary text-sm px-6 py-3 self-start sm:self-auto">
          + Yeni CV Oluştur
        </Link>
      </div>

      {/* ── CV Listesi ── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl text-ink">CV'lerim</h2>
          <span className="font-mono text-xs text-ink-muted">
            {resumes.length} CV
          </span>
        </div>

        {resumes.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">◇</div>
            <h3 className="font-display text-xl text-ink mb-2">Henüz CV yok</h3>
            <p className="font-sans text-sm text-ink-muted mb-6">
              İlk CV'ni oluşturmak için aşağıdaki butona tıkla.
            </p>
            <Link href="/cv-builder" className="btn-primary px-8 py-3">
              CV Oluştur
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={(r) => setDeleteTarget(r)}
                onView={(r) => setViewTarget(r)}
                isDuplicating={isDuplicating}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── AI Araçları ── */}
      <section className="mb-12">
        <div className="mb-5">
          <p className="font-mono text-xs text-ink-muted tracking-widest uppercase mb-1">
            AI Araçları
          </p>
          <h2 className="font-display text-2xl text-ink">AI ile Oluştur</h2>
        </div>
        <div className="max-w-xl">
          <AiPanel planInfo={planInfo} />
        </div>
      </section>

      {/* ── Hesap & Plan bilgisi ── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-paper-border">
          <div>
            <p className="font-sans text-xs text-ink-muted tracking-widest uppercase mb-1">
              Giriş yapılan hesap
            </p>
            <p className="font-sans text-sm text-ink">{user.email}</p>
          </div>
          {/* Plan rozeti */}
          {planInfo && (() => {
            const badge = getPlanBadge(planInfo.plan);
            return (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[11px] self-start sm:self-auto ${badge.color} ${badge.bg} ${badge.border}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block opacity-70" />
                {badge.label} Plan
              </span>
            );
          })()}
        </div>

        {/* AI Kullanım Göstergesi */}
        {planInfo && !planInfo.isProUser && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-sans text-xs text-ink-muted">Aylık AI kullanımı</span>
              <span className="font-mono text-xs text-ink">
                {planInfo.aiUsageCount} / {FREE_AI_LIMIT}
              </span>
            </div>
            <div className="h-1.5 w-full bg-paper-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (planInfo.aiUsageCount / FREE_AI_LIMIT) * 100)}%`,
                  background: planInfo.remainingFreeUses === 0 ? "#c4423a" : "#c4783a",
                }}
              />
            </div>
            {planInfo.remainingFreeUses === 0 ? (
              <p className="mt-1.5 font-sans text-xs text-error">
                Aylık limitine ulaştın. Pro plana geçerek devam edebilirsin.
              </p>
            ) : (
              <p className="mt-1.5 font-sans text-xs text-ink-muted">
                {planInfo.remainingFreeUses} kullanım hakkı kaldı.
              </p>
            )}
          </div>
        )}

        {planInfo?.isProUser && (
          <div className="flex items-center gap-2 font-sans text-xs text-ink-muted">
            <span className="text-amber-600">✦</span>
            Sınırsız AI üretimi aktif.
          </div>
        )}

        {/* Upgrade / Portal butonu */}
        <div className="mt-4 pt-4 border-t border-paper-border">
          <UpgradeButton isPro={planInfo?.isProUser ?? false} />
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveResume } from "@/lib/actions/resume";
import AiPanel from "@/components/ai-panel";
import type { ResumeData, PlanInfo } from "@/lib/types";

interface CvFormProps {
  initialData: ResumeData | null;
  planInfo?: PlanInfo | null;
}

// ─── Validasyon kuralları ─────────────────────────────────────────────────────

interface ValidationErrors {
  title?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  summary?: string;
  work_experience?: string;
  education?: string;
  skills?: string;
}

function validateForm(data: Record<string, string>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Ad Soyad — zorunlu
  if (!data.full_name?.trim()) {
    errors.full_name = "Ad soyad zorunludur.";
  } else if (data.full_name.trim().length < 2) {
    errors.full_name = "Ad soyad en az 2 karakter olmalıdır.";
  }

  // E-posta — girilmişse geçerli olmalı
  if (data.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  // Telefon — girilmişse sadece rakam, boşluk, +, - içerebilir
  if (data.phone?.trim() && !/^[+\d\s\-()]{7,20}$/.test(data.phone.trim())) {
    errors.phone = "Geçerli bir telefon numarası girin.";
  }

  // LinkedIn — girilmişse geçerli URL olmalı
  if (data.linkedin?.trim()) {
    try {
      new URL(data.linkedin.trim());
    } catch {
      errors.linkedin = "Geçerli bir URL girin (örn. https://linkedin.com/in/...)";
    }
  }

  // Özet — girilmişse çok kısa olmasın
  if (data.summary?.trim() && data.summary.trim().length < 20) {
    errors.summary = "Özet en az 20 karakter olmalıdır.";
  }

  return errors;
}

// ─── Küçük yardımcı bileşenler ───────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 font-sans text-xs text-error">
      <span>⚠</span>
      {message}
    </p>
  );
}

function SectionHeader({
  number,
  title,
  description,
  isComplete,
}: {
  number: number;
  title: string;
  description: string;
  isComplete: boolean;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono transition-colors duration-300 ${
          isComplete
            ? "bg-success text-white"
            : "bg-paper-border text-ink-muted"
        }`}
      >
        {isComplete ? "✓" : number}
      </div>
      <div>
        <h2 className="font-display text-xl text-ink leading-tight">{title}</h2>
        <p className="font-sans text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function InputField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  defaultValue,
  required,
  error,
  hint,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  onChange?: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-text">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className={`input-field transition-colors ${
          error ? "border-error focus:border-error focus:ring-error/20" : ""
        }`}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 font-sans text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError message={error} />
    </div>
  );
}

function TextareaField({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  rows,
  error,
  hint,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  rows: number;
  error?: string;
  hint?: string;
  onChange?: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-text">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 font-sans text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className={`textarea-field transition-colors ${
          error ? "border-error focus:border-error focus:ring-error/20" : ""
        }`}
        onChange={onChange}
        aria-invalid={!!error}
      />
      <FieldError message={error} />
    </div>
  );
}

// ─── İpuçları ─────────────────────────────────────────────────────────────────

const tips = [
  "İş deneyiminde güçlü eylem fiilleri kullan — Yönettim, Geliştirdim, Artırdım.",
  "Rakamsal başarılar ekle: satışları %30 artırdım, 10 kişilik ekibi yönettim.",
  "Özeti kısa tut: 2–4 cümle yeterli.",
  "Becerileri başvurduğun pozisyona göre sırala.",
  "LinkedIn linkin güncel ve fotoğraflı olsun.",
];

// ─── İlerleme göstergesi ──────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="card p-5 mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="font-sans text-xs text-ink-muted">CV tamamlanma</span>
        <span className="font-mono text-xs font-medium text-ink">%{pct}</span>
      </div>
      <div className="h-1.5 w-full bg-paper-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              pct === 100 ? "#2d7a4f" : pct > 60 ? "#c4783a" : "#1a1a2e",
          }}
        />
      </div>
      {pct === 100 && (
        <p className="mt-2 font-sans text-xs text-success">
          ✓ CV'n eksiksiz görünüyor!
        </p>
      )}
    </div>
  );
}

// ─── Ana form bileşeni ────────────────────────────────────────────────────────

export default function CvForm({ initialData, planInfo }: CvFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tamamlanma yüzdesini canlı hesapla
  function calcCompletion(): number {
    if (!formRef.current) {
      // Form henüz mount edilmemişse initialData'dan hesapla
      if (!initialData) return 0;
      const keys: (keyof ResumeData)[] = [
        "title", "full_name", "email", "phone", "location",
        "linkedin", "summary", "work_experience", "education", "skills",
      ];
      const filled = keys.filter((k) => {
        const v = initialData[k];
        return typeof v === "string" && v.trim().length > 0;
      }).length;
      return Math.round((filled / keys.length) * 100);
    }
    const fd = new FormData(formRef.current);
    const keys = ["title", "full_name", "email", "phone", "location",
      "linkedin", "summary", "work_experience", "education", "skills"];
    const filled = keys.filter((k) => (fd.get(k) as string)?.trim().length > 0).length;
    return Math.round((filled / keys.length) * 100);
  }

  const [completion, setCompletion] = useState<number>(calcCompletion);

  function handleFieldChange() {
    setCompletion(calcCompletion());
    // Bir alan değişince o alanın hatasını temizle
  }

  // Bölüm tamamlanma durumu (sidebar numaraları için)
  function isSectionComplete(fields: string[]): boolean {
    if (!formRef.current) return false;
    const fd = new FormData(formRef.current);
    return fields.every((f) => (fd.get(f) as string)?.trim().length > 0);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setSaveSuccess(false);

    const formData = new FormData(e.currentTarget);

    // Client-side validasyon
    const rawData: Record<string, string> = {};
    formData.forEach((val, key) => {
      rawData[key] = val as string;
    });

    const validationErrors = validateForm(rawData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // İlk hatalı alana scroll et
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(firstErrorKey);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      return;
    }

    setErrors({});

    startTransition(async () => {
      const result = await saveResume(formData);
      if (result.success) {
        setSaveSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (!initialData) {
          // Yeni oluşturuldu → dashboard'a git
          setTimeout(() => router.push("/dashboard"), 1200);
        }
      } else {
        setServerError(result.error ?? "Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    });
  }

  function clearError(field: keyof ValidationErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      {initialData?.id && (
        <input type="hidden" name="resume_id" value={initialData.id} />
      )}

      {/* Başarı banner */}
      {saveSuccess && (
        <div className="mb-8 flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 border border-green-200 text-success font-sans text-sm">
          <span className="text-lg">✓</span>
          <div>
            <strong className="font-sans">CV kaydedildi!</strong>
            {!initialData && (
              <span className="ml-1 text-ink-muted">Dashboard'a yönlendiriliyorsun…</span>
            )}
          </div>
        </div>
      )}

      {/* Sunucu hatası */}
      {serverError && (
        <div className="mb-8 flex items-start gap-3 px-5 py-4 rounded-xl bg-red-50 border border-red-200 text-error font-sans text-sm">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Sol: Ana form ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* İlerleme çubuğu — mobilde görünür */}
          <div className="lg:hidden">
            <ProgressBar pct={completion} />
          </div>

          {/* ─── Bölüm 1: CV Başlığı ─────────────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={1}
              title="CV Başlığı"
              description="Bu CV'ye tanımlayıcı bir isim ver."
              isComplete={!!formRef.current && isSectionComplete(["title"])}
            />
            <InputField
              id="title"
              name="title"
              label="Başlık"
              placeholder="örn. Google Başvurusu · Yazılım Mühendisi"
              defaultValue={initialData?.title}
              error={errors.title}
              hint="Birden fazla CV oluşturabilirsin — her biri için farklı başlık kullan."
              onChange={() => { clearError("title"); handleFieldChange(); }}
            />
          </section>

          {/* ─── Bölüm 2: Kişisel Bilgiler ───────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={2}
              title="Kişisel Bilgiler"
              description="CV'nde görünecek iletişim bilgilerin."
              isComplete={!!formRef.current && isSectionComplete(["full_name", "email"])}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <InputField
                  id="full_name"
                  name="full_name"
                  label="Ad Soyad"
                  placeholder="Ahmet Yılmaz"
                  defaultValue={initialData?.full_name}
                  required
                  error={errors.full_name}
                  onChange={() => { clearError("full_name"); handleFieldChange(); }}
                />
              </div>
              <InputField
                id="email"
                name="email"
                label="E-posta"
                type="email"
                placeholder="ahmet@ornek.com"
                defaultValue={initialData?.email}
                error={errors.email}
                onChange={() => { clearError("email"); handleFieldChange(); }}
              />
              <InputField
                id="phone"
                name="phone"
                label="Telefon"
                type="tel"
                placeholder="+90 555 000 00 00"
                defaultValue={initialData?.phone}
                error={errors.phone}
                onChange={() => { clearError("phone"); handleFieldChange(); }}
              />
              <InputField
                id="location"
                name="location"
                label="Konum"
                placeholder="İstanbul, Türkiye"
                defaultValue={initialData?.location}
                error={errors.location}
                onChange={() => { clearError("location"); handleFieldChange(); }}
              />
              <InputField
                id="linkedin"
                name="linkedin"
                label="LinkedIn URL"
                type="url"
                placeholder="https://linkedin.com/in/kullanici"
                defaultValue={initialData?.linkedin}
                error={errors.linkedin}
                onChange={() => { clearError("linkedin"); handleFieldChange(); }}
              />
            </div>
          </section>

          {/* ─── Bölüm 3: Profesyonel Özet ───────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={3}
              title="Profesyonel Özet"
              description="Kendini 2–4 güçlü cümleyle tanıt."
              isComplete={!!formRef.current && isSectionComplete(["summary"])}
            />
            <TextareaField
              id="summary"
              name="summary"
              label="Özet"
              placeholder="5+ yıl deneyimli yazılım mühendisiyim. Ölçeklenebilir web uygulamaları geliştirme ve ekip liderliği konusunda güçlü bir geçmişim var. Kullanıcı odaklı ürünler ortaya çıkarmaya tutkuluyum."
              defaultValue={initialData?.summary}
              rows={5}
              error={errors.summary}
              hint="Hedef pozisyona göre uyarla. İlk cümle dikkat çekici olsun."
              onChange={() => { clearError("summary"); handleFieldChange(); }}
            />
          </section>

          {/* ─── Bölüm 4: İş Deneyimi ────────────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={4}
              title="İş Deneyimi"
              description="En son işten başlayarak geriye doğru sırala."
              isComplete={!!formRef.current && isSectionComplete(["work_experience"])}
            />
            <TextareaField
              id="work_experience"
              name="work_experience"
              label="Deneyimler"
              placeholder={
                "Kıdemli Yazılım Mühendisi — Şirket A.Ş. (2022–Günümüz)\n• Mikro servis mimarisine geçişi yönettim, deploy süresini %60 azalttım\n• 8 kişilik ekibe teknik mentorlük yaptım\n\nYazılım Mühendisi — Startup Ltd. (2020–2022)\n• 50k+ kullanıcının aktif kullandığı 3 özellik geliştirdim"
              }
              defaultValue={initialData?.work_experience}
              rows={12}
              error={errors.work_experience}
              hint="Her rol için: Pozisyon — Şirket (Tarih) formatını kullan, altına bullet point'ler ekle."
              onChange={() => { clearError("work_experience"); handleFieldChange(); }}
            />
          </section>

          {/* ─── Bölüm 5: Eğitim ─────────────────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={5}
              title="Eğitim"
              description="Diplomalar, sertifikalar ve tamamlanan kurslar."
              isComplete={!!formRef.current && isSectionComplete(["education"])}
            />
            <TextareaField
              id="education"
              name="education"
              label="Eğitim Geçmişi"
              placeholder={
                "Bilgisayar Mühendisliği — İstanbul Teknik Üniversitesi (2016–2020)\nBölüm birincisi · GPA: 3.8/4.0\n\nAWS Certified Solutions Architect (2023)"
              }
              defaultValue={initialData?.education}
              rows={6}
              error={errors.education}
              hint="En güncel eğitimden başla."
              onChange={() => { clearError("education"); handleFieldChange(); }}
            />
          </section>

          {/* ─── Bölüm 6: Beceriler ──────────────────────────────────────── */}
          <section className="card p-8">
            <SectionHeader
              number={6}
              title="Beceriler"
              description="Teknik ve kişisel becerilerini virgülle ayır."
              isComplete={!!formRef.current && isSectionComplete(["skills"])}
            />
            <TextareaField
              id="skills"
              name="skills"
              label="Beceri Listesi"
              placeholder="TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, AWS, Takım çalışması, İletişim"
              defaultValue={initialData?.skills}
              rows={3}
              error={errors.skills}
              hint="Başvurduğun pozisyonla en alakalı becerileri öne çıkar."
              onChange={() => { clearError("skills"); handleFieldChange(); }}
            />
          </section>

          {/* ─── Kaydet butonu ────────────────────────────────────────────── */}
          <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-sans text-xs text-ink-muted">
                {initialData?.updated_at
                  ? `Son kayıt: ${new Date(initialData.updated_at).toLocaleDateString("tr-TR", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}`
                  : "Henüz kaydedilmedi"}
              </p>
              {Object.keys(errors).length > 0 && (
                <p className="font-sans text-xs text-error mt-1">
                  ⚠ Lütfen kırmızı işaretli alanları düzelt.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="btn-ghost text-sm px-5 py-2.5"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary px-8 py-2.5 text-sm flex items-center gap-2"
              >
                {isPending && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {isPending ? "Kaydediliyor…" : "CV'yi Kaydet"}
              </button>
            </div>
          </div>

          {/* Alt boşluk */}
          <div className="pb-8" />
        </div>

        {/* ── Sağ sidebar (sadece masaüstü) ── */}
        <aside className="hidden lg:flex flex-col gap-5 sticky top-24">
          {/* İlerleme */}
          <ProgressBar pct={completion} />

          {/* AI Paneli */}
          <AiPanel planInfo={planInfo} resumeId={initialData?.id} />

          {/* İpuçları */}
          <div className="card p-6">
            <h3 className="font-display text-base mb-4">✦ İpuçları</h3>
            <ul className="space-y-3">
              {tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 font-sans text-xs text-ink-muted leading-relaxed"
                >
                  <span className="mt-0.5 shrink-0 text-accent">◈</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </form>
  );
}

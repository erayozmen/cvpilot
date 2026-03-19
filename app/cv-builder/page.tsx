import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getResumeById } from "@/lib/actions/resume";
import Navbar from "@/components/navbar";
import CvForm from "@/components/cv-form";

export const metadata = {
  title: "CV Builder — CVPilot",
};

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function CvBuilderPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const resume = params.id ? await getResumeById(params.id) : null;

  const isEditing = !!resume;

  return (
    <>
      <Navbar user={user} />

      <main className="page-container py-10 md:py-14">
        {/* Üst başlık */}
        <div className="mb-8">
          {/* Geri linki */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted hover:text-ink transition-colors mb-5"
          >
            ← Dashboard'a dön
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full border border-paper-border bg-paper-warm text-xs font-mono text-ink-muted tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                {isEditing ? "CV Düzenle" : "Yeni CV"}
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-ink">
                {isEditing
                  ? resume.title || "CV Düzenle"
                  : "Yeni CV Oluştur"}
              </h1>
              {isEditing && (
                <p className="font-sans text-sm text-ink-muted mt-1">
                  Değişikliklerini kaydetmeyi unutma.
                </p>
              )}
            </div>

            {/* Tamamlanma rozetleri */}
            {isEditing && (
              <div className="flex items-center gap-2 text-xs font-sans text-ink-muted">
                <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                {resume.updated_at
                  ? `Son güncelleme: ${new Date(resume.updated_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : "Kaydedilmemiş"}
              </div>
            )}
          </div>
        </div>

        <CvForm initialData={resume} />
      </main>
    </>
  );
}

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getResumeById } from "@/lib/actions/resume";
import Navbar from "@/components/navbar";
import ResumePreview from "@/components/resume-preview";

export const metadata = {
  title: "CV Önizleme — CVPilot",
};

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResumePreviewPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;

  // id yoksa dashboard'a gönder
  if (!params.id) redirect("/dashboard");

  const resume = await getResumeById(params.id);

  // CV bulunamadıysa veya başka kullanıcıya aitse 404
  if (!resume) notFound();

  return (
    <>
      <Navbar user={user} />

      {/* Araç çubuğu */}
      <div className="border-b border-paper-border bg-paper-warm sticky top-16 z-40">
        <div className="page-container flex items-center justify-between h-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted hover:text-ink transition-colors"
          >
            ← Dashboard'a dön
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-ink-muted hidden sm:inline">
              {resume.title || "İsimsiz CV"}
            </span>
            <Link
              href={`/cv-builder?id=${resume.id}`}
              className="btn-ghost text-xs px-4 py-1.5"
            >
              Düzenle
            </Link>
            {/* PDF export butonu — ileride bağlanacak */}
            <button
              disabled
              className="btn-primary text-xs px-4 py-1.5 opacity-50 cursor-not-allowed"
              title="Yakında aktif olacak"
            >
              PDF İndir
            </button>
          </div>
        </div>
      </div>

      {/* Önizleme alanı — hafif gri zemin üzerinde beyaz kağıt */}
      <div className="min-h-screen py-10 px-4" style={{ background: "#e8e5de" }}>
        <ResumePreview resume={resume} />
      </div>
    </>
  );
}

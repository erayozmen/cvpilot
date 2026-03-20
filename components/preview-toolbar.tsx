"use client";

import { useState } from "react";
import Link from "next/link";
import { exportResumeToPdf } from "@/lib/pdf-export";
import type { ResumeData } from "@/lib/types";

interface PreviewToolbarProps {
  resume: ResumeData;
}

export default function PreviewToolbar({ resume }: PreviewToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handlePdfExport() {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);

    try {
      await exportResumeToPdf(resume);
    } catch (err) {
      console.error("PDF export hatası:", err);
      setExportError("PDF oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="border-b border-paper-border bg-paper-warm sticky top-16 z-40">
        <div className="page-container flex items-center justify-between h-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted hover:text-ink transition-colors"
          >
            ← Dashboard'a dön
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-sans text-xs text-ink-muted hidden sm:inline truncate max-w-[180px]">
              {resume.title || "İsimsiz CV"}
            </span>
            <Link
              href={`/cv-builder?id=${resume.id}`}
              className="btn-ghost text-xs px-4 py-1.5"
            >
              Düzenle
            </Link>
            <button
              onClick={handlePdfExport}
              disabled={isExporting}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Hazırlanıyor…
                </>
              ) : (
                <>⬇ PDF İndir</>
              )}
            </button>
          </div>
        </div>
      </div>

      {exportError && (
        <div className="sticky top-28 z-40 page-container">
          <div className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-error font-sans text-xs">
            <span>⚠</span>
            <span>{exportError}</span>
            <button onClick={() => setExportError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * pdf-export.ts
 * html2canvas ile #resume-document elementini yakalar,
 * jsPDF ile tek sayfalık PDF oluşturur.
 * İçerik A4'ten uzunsa birden fazla sayfaya böler.
 */

import type { ResumeData } from "@/lib/types";

export interface PdfExportOptions {
  filename?: string;
}

function toSafeFilename(input: unknown): string {
  const name = typeof input === "string" ? input : "";
  return (
    name
      .replace(/ğ/g, "g").replace(/Ğ/g, "G")
      .replace(/ü/g, "u").replace(/Ü/g, "U")
      .replace(/ş/g, "s").replace(/Ş/g, "S")
      .replace(/ı/g, "i").replace(/İ/g, "I")
      .replace(/ö/g, "o").replace(/Ö/g, "O")
      .replace(/ç/g, "c").replace(/Ç/g, "C")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "CV"
  );
}

export async function exportResumeToPdf(
  resume: ResumeData,
  options: PdfExportOptions = {}
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const element = document.getElementById("resume-document");
  if (!element) throw new Error("#resume-document elementi bulunamadı.");

  const safeName = toSafeFilename(resume?.full_name);
  const filename = options.filename ?? `${safeName}-CV.pdf`;

  // ── 1. Elementin GERÇEK içerik yüksekliğini al ────────────────────────────
  // Önce min-height ve height kısıtlarını geçici olarak kaldır
  const originalMinHeight = element.style.minHeight;
  const originalHeight = element.style.height;
  element.style.minHeight = "0";
  element.style.height = "auto";

  // Tarayıcının layout'u güncellemesi için bir frame bekle
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const realHeight = element.scrollHeight;
  const realWidth  = element.scrollWidth;

  // ── 2. Canvas'a çiz ───────────────────────────────────────────────────────
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: realWidth,
    height: realHeight,
    windowWidth: realWidth,
    windowHeight: realHeight,
  });

  // Orijinal stilleri geri yükle
  element.style.minHeight = originalMinHeight;
  element.style.height = originalHeight;

  // ── 3. Boyutları hesapla ──────────────────────────────────────────────────
  const PDF_W_MM  = 210;
  const PDF_H_MM  = 297;
  const mmPerPx   = PDF_W_MM / canvas.width;
  const contentH  = canvas.height * mmPerPx; // gerçek içerik yüksekliği (mm)

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (contentH <= PDF_H_MM) {
    // ── Tek sayfa ─────────────────────────────────────────────────────────
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0, 0,
      PDF_W_MM,
      contentH   // A4'ün tamamını değil, sadece içerik kadar kullan
    );
  } else {
    // ── Çok sayfa: canvas'ı dilimle ───────────────────────────────────────
    const pageH_px = Math.floor(PDF_H_MM / mmPerPx);
    let yPx = 0;

    while (yPx < canvas.height) {
      if (yPx > 0) pdf.addPage();

      const sliceH_px = Math.min(pageH_px, canvas.height - yPx);

      const slice = document.createElement("canvas");
      slice.width  = canvas.width;
      slice.height = sliceH_px;

      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH_px, 0, 0, canvas.width, sliceH_px);

      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.98),
        "JPEG",
        0, 0,
        PDF_W_MM,
        sliceH_px * mmPerPx
      );

      yPx += sliceH_px;
    }
  }

  pdf.save(filename);
}

/**
 * ResumePreview — tek sayfalık, ATS dostu CV şablonu.
 *
 * Tasarım ilkeleri:
 * - Saf beyaz arka plan, siyah metin → ATS tarayıcılar için idealdir
 * - Sistem fontları kullanılmaz; okunabilir serif seçilir
 * - Tüm bölümler mantıklı HTML hiyerarşisiyle işaretlenir (h1, h2, ul vs.)
 * - İleride PDF export için "use client" değil → server component olarak çalışır
 * - Boş alanlar sessizce atlanır, layout bozulmaz
 */

import type { ResumeData } from "@/lib/types";

interface ResumePreviewProps {
  resume: ResumeData;
}

// ─── Yardımcı: boş mu? ───────────────────────────────────────────────────────

function isEmpty(val?: string): boolean {
  return !val || val.trim().length === 0;
}

// ─── Yardımcı: çok satırlı metni paragraflara/bullet'lara böl ────────────────
// "• " ile başlayan satırlar bullet, diğerleri paragraf olarak render edilir.

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");

  const blocks: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  function flushBullets() {
    if (bulletGroup.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className="list-none space-y-1 mb-3">
        {bulletGroup.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bulletGroup = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line === "") {
      flushBullets();
      continue;
    }

    // "• " veya "- " ile başlıyorsa bullet
    if (/^[•\-]\s/.test(line)) {
      bulletGroup.push(line.replace(/^[•\-]\s+/, "").trim());
    } else {
      flushBullets();
      // Boş olmayan normal satır — kalın göründüğünde "başlık satırı" gibi davran
      const isBold =
        line.endsWith(")") ||   // ör: "Şirket A.Ş. (2021–Günümüz)"
        /—|–/.test(line);       // ör: "Kıdemli Mühendis — Şirket"

      blocks.push(
        <p
          key={blocks.length}
          className={`text-sm leading-relaxed mb-1 ${isBold ? "font-semibold text-gray-900" : "text-gray-700"}`}
        >
          {line}
        </p>
      );
    }
  }

  flushBullets();
  return <>{blocks}</>;
}

// ─── Beceriler — pill listesi ─────────────────────────────────────────────────

function SkillPills({ skills }: { skills: string }) {
  const items = skills
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((skill) => (
        <span
          key={skill}
          className="inline-block px-3 py-1 rounded border border-gray-300 text-xs text-gray-700 bg-gray-50"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

// ─── Bölüm başlığı ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-xs font-sans font-semibold tracking-[0.15em] uppercase text-gray-500">
        {children}
      </h2>
      <div className="mt-1 h-px bg-gray-200" />
    </div>
  );
}

// ─── İletişim bilgisi satırı ──────────────────────────────────────────────────

function ContactItem({ icon, value, href }: { icon: string; value: string; href?: string }) {
  const content = (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-gray-400">{icon}</span>
      {value}
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
        {content}
      </a>
    );
  }

  return <>{content}</>;
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────

export default function ResumePreview({ resume }: ResumePreviewProps) {
  return (
    /*
     * id="resume-document" → PDF export sırasında bu elementi hedef alacak.
     * max-w-[794px] → A4 genişliği (~794px @ 96dpi)
     * min-h-[1123px] → A4 yüksekliği (~1123px @ 96dpi)
     */
    <div
      id="resume-document"
      className="bg-white mx-auto max-w-[794px] shadow-xl print:shadow-none print:max-w-full"
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#1a1a1a",
        padding: "48px 56px",
      }}
    >
      {/* ── Üst: Ad ve iletişim ─────────────────────────────────────────── */}
      <header className="mb-7">
        <h1
          className="font-bold leading-tight mb-3"
          style={{
            fontSize: "28px",
            letterSpacing: "-0.01em",
            color: "#111111",
          }}
        >
          {resume.full_name || "Ad Soyad"}
        </h1>

        {/* İletişim bilgileri — tek satır, responsive wrap */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {!isEmpty(resume.email) && (
            <ContactItem
              icon="✉"
              value={resume.email}
              href={`mailto:${resume.email}`}
            />
          )}
          {!isEmpty(resume.phone) && (
            <ContactItem
              icon="☎"
              value={resume.phone}
              href={`tel:${resume.phone}`}
            />
          )}
          {!isEmpty(resume.location) && (
            <ContactItem icon="⌖" value={resume.location} />
          )}
          {!isEmpty(resume.linkedin) && (
            <ContactItem
              icon="in"
              value={
                resume.linkedin
                  .replace(/^https?:\/\/(www\.)?/, "")
                  .replace(/\/$/, "")
              }
              href={resume.linkedin}
            />
          )}
        </div>
      </header>

      {/* ── Özet ────────────────────────────────────────────────────────── */}
      {!isEmpty(resume.summary) && (
        <section className="mb-7">
          <SectionTitle>Profesyonel Özet</SectionTitle>
          <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
        </section>
      )}

      {/* ── İş Deneyimi ─────────────────────────────────────────────────── */}
      {!isEmpty(resume.work_experience) && (
        <section className="mb-7">
          <SectionTitle>İş Deneyimi</SectionTitle>
          <RichText text={resume.work_experience} />
        </section>
      )}

      {/* ── Eğitim ──────────────────────────────────────────────────────── */}
      {!isEmpty(resume.education) && (
        <section className="mb-7">
          <SectionTitle>Eğitim</SectionTitle>
          <RichText text={resume.education} />
        </section>
      )}

      {/* ── Beceriler ───────────────────────────────────────────────────── */}
      {!isEmpty(resume.skills) && (
        <section className="mb-7">
          <SectionTitle>Beceriler</SectionTitle>
          <SkillPills skills={resume.skills} />
        </section>
      )}

      {/* Hiçbir alan dolu değilse uyarı */}
      {isEmpty(resume.summary) &&
        isEmpty(resume.work_experience) &&
        isEmpty(resume.education) &&
        isEmpty(resume.skills) && (
          <div className="text-center py-16 text-gray-400 text-sm">
            CV henüz doldurulmamış. Düzenle butonuna tıkla.
          </div>
        )}
    </div>
  );
}

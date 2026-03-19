import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <div className="text-5xl mb-4">◇</div>
        <h2 className="font-display text-2xl text-ink mb-2">CV Bulunamadı</h2>
        <p className="font-sans text-sm text-ink-muted mb-6">
          Bu CV mevcut değil ya da sana ait değil.
        </p>
        <Link href="/dashboard" className="btn-primary px-6 py-2.5 text-sm">
          Dashboard'a Dön
        </Link>
      </div>
    </div>
  );
}

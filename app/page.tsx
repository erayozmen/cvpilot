import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import Navbar from "@/components/navbar";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Navbar user={user} />

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Decorative background */}
          <div
            className="absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 60% 0%, rgba(196,120,58,0.08) 0%, transparent 70%), " +
                "radial-gradient(ellipse 50% 80% at 0% 100%, rgba(26,26,46,0.05) 0%, transparent 60%)",
            }}
          />

          <div className="page-container pt-24 pb-32 md:pt-36 md:pb-48">
            <div className="max-w-3xl">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-paper-border bg-paper-warm text-xs font-mono text-ink-muted tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                Free CV Builder
              </div>

              <h1 className="font-display text-5xl md:text-7xl leading-[1.1] text-ink mb-6">
                Your career,
                <br />
                <em className="not-italic text-accent">beautifully</em>
                <br />
                presented.
              </h1>

              <p className="text-lg md:text-xl text-ink-muted font-sans font-light max-w-xl mb-10 leading-relaxed">
                CVPilot turns your experience into a polished, professional CV and
                cover letter — ready to send in minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {user ? (
                  <Link href="/dashboard" className="btn-primary text-base px-8 py-4">
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn-primary text-base px-8 py-4">
                      Get started — it's free
                    </Link>
                    <Link href="/login" className="btn-ghost text-base px-8 py-4">
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Divider line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-paper-border" />
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section className="page-container py-24">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-ink mb-4">
              Everything you need
            </h2>
            <p className="text-ink-muted font-sans text-base max-w-md mx-auto">
              A focused set of tools to get your job application ready, fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-8 group hover:shadow-card-hover transition-shadow duration-300">
                <div className="text-3xl mb-5">{f.icon}</div>
                <h3 className="font-display text-lg mb-2">{f.title}</h3>
                <p className="font-sans text-sm text-ink-muted leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA banner ─────────────────────────────────────────────────── */}
        <section className="border-t border-paper-border">
          <div className="page-container py-24 text-center">
            <h2 className="font-display text-3xl md:text-5xl mb-6 max-w-2xl mx-auto leading-tight">
              Ready to land your next role?
            </h2>
            <Link href={user ? "/cv-builder" : "/signup"} className="btn-accent text-base px-10 py-4">
              {user ? "Open CV Builder" : "Create your free account"}
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-paper-border">
        <div className="page-container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-ink-muted text-sm">CVPilot</span>
          <p className="font-sans text-xs text-ink-muted">
            © {new Date().getFullYear()} CVPilot. Built with Next.js & Supabase.
          </p>
        </div>
      </footer>
    </>
  );
}

const features = [
  {
    icon: "✦",
    title: "Simple CV builder",
    body: "Fill in a clean form with all the sections that matter. No clutter, no confusion.",
  },
  {
    icon: "◈",
    title: "Save & come back",
    body: "Your progress is saved to your account. Pick up where you left off anytime.",
  },
  {
    icon: "◇",
    title: "AI generation — coming soon",
    body: "Soon you'll be able to generate a polished PDF CV and tailored cover letter in one click.",
  },
];

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AuthForm from "@/components/auth-form";

export const metadata = {
  title: "Create account — CVPilot",
};

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <aside
        className="hidden lg:flex flex-col justify-between w-[45%] p-12"
        style={{
          background:
            "linear-gradient(145deg, #1a1a2e 0%, #2d2d44 100%)",
        }}
      >
        <Link href="/" className="font-display text-2xl text-paper/90">
          CVPilot
        </Link>
        <div className="mb-12 space-y-4">
          {[
            "Free forever for the basics",
            "Save and edit your CV anytime",
            "AI generation coming soon",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs">
                ✓
              </span>
              <span className="font-sans text-sm text-paper/70">{item}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden font-display text-2xl text-ink block mb-10">
            CVPilot
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink mb-2">Create your account</h1>
            <p className="font-sans text-sm text-ink-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <AuthForm mode="signup" />
        </div>
      </main>
    </div>
  );
}

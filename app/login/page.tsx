import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AuthForm from "@/components/auth-form";

export const metadata = {
  title: "Log in — CVPilot",
};

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
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
        <blockquote className="mb-12">
          <p className="font-display text-3xl text-paper/80 leading-snug italic">
            "Your story deserves to be told with clarity."
          </p>
        </blockquote>
      </aside>

      {/* Right panel — form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-paper">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden font-display text-2xl text-ink block mb-10">
            CVPilot
          </Link>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink mb-2">Welcome back</h1>
            <p className="font-sans text-sm text-ink-muted">
              Don't have an account?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Sign up free
              </Link>
            </p>
          </div>

          <AuthForm mode="login" />
        </div>
      </main>
    </div>
  );
}

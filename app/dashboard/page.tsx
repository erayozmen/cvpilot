import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getAllResumes } from "@/lib/actions/resume";
import { getPlanInfo } from "@/lib/actions/profile";
import Navbar from "@/components/navbar";
import DashboardShell from "@/components/dashboard-shell";

export const metadata = {
  title: "Dashboard — CVPilot",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Paralel çek — birini beklerken diğeri de yüklensin
  const [resumes, planInfo] = await Promise.all([
    getAllResumes(),
    getPlanInfo(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <DashboardShell user={user} resumes={resumes} planInfo={planInfo} />
    </>
  );
}

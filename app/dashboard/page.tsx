import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getAllResumes } from "@/lib/actions/resume";
import { getPlanInfo } from "@/lib/actions/profile";
import Navbar from "@/components/navbar";
import DashboardShell from "@/components/dashboard-shell";

export const metadata = {
  title: "Dashboard — CVPilot",
};

interface Props {
  searchParams: Promise<{ upgrade?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const upgradeStatus = params.upgrade ?? null;

  const [resumes, planInfo] = await Promise.all([
    getAllResumes(),
    getPlanInfo(),
  ]);

  return (
    <>
      <Navbar user={user} />
      <DashboardShell
        user={user}
        resumes={resumes}
        planInfo={planInfo}
        upgradeStatus={upgradeStatus}
      />
    </>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getAllResumes } from "@/lib/actions/resume";
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

  const resumes = await getAllResumes();

  return (
    <>
      <Navbar user={user} />
      <DashboardShell user={user} resumes={resumes} />
    </>
  );
}

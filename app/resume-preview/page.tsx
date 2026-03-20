import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getResumeById } from "@/lib/actions/resume";
import Navbar from "@/components/navbar";
import ResumePreview from "@/components/resume-preview";
import PreviewToolbar from "@/components/preview-toolbar";

export const metadata = { title: "CV Önizleme — CVPilot" };

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResumePreviewPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  if (!params.id) redirect("/dashboard");

  const resume = await getResumeById(params.id);
  if (!resume) notFound();

  return (
    <>
      <Navbar user={user} />
      <PreviewToolbar resume={resume} />
      <div className="min-h-screen py-10 px-4" style={{ background: "#e8e5de" }}>
        <ResumePreview resume={resume} />
      </div>
    </>
  );
}

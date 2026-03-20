"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/stripe";

interface UpgradeButtonProps {
  isPro: boolean;
}

export default function UpgradeButton({ isPro }: UpgradeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = isPro
        ? await createPortalSession()
        : await createCheckoutSession();

      // redirect() çağrılmışsa buraya gelinmez.
      // Buraya geldiyse hata var demektir.
      if (result && !result.success) {
        setError(result.error ?? "Bir hata oluştu.");
      }
    });
  }

  if (isPro) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleClick}
          disabled={isPending}
          className="btn-ghost text-xs px-4 py-2 self-start disabled:opacity-50"
        >
          {isPending ? "Yönlendiriliyor…" : "Aboneliği Yönet"}
        </button>
        {error && (
          <p className="font-sans text-xs text-error">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-sans text-sm font-normal transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait self-start"
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Yönlendiriliyor…
          </>
        ) : (
          <>✦ Pro'ya Geç</>
        )}
      </button>
      {error && (
        <p className="font-sans text-xs text-error">{error}</p>
      )}
    </div>
  );
}

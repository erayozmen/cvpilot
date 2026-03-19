"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { logOut } from "@/lib/actions/auth";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/cv-builder", label: "CV Builder" },
      ]
    : [
        { href: "/login", label: "Log in" },
        { href: "/signup", label: "Sign up" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-paper-border bg-paper/80 backdrop-blur-md">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl text-ink hover:text-accent transition-colors"
          >
            CVPilot
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg font-sans text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:text-ink hover:bg-paper-border/60"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <form action={logOut}>
                <button
                  type="submit"
                  className="ml-2 px-4 py-2 rounded-lg font-sans text-sm text-ink-muted hover:text-ink hover:bg-paper-border/60 transition-colors"
                >
                  Log out
                </button>
              </form>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-border/60 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1 transition-all" />
            <span className="block w-5 h-0.5 bg-current mb-1 transition-all" />
            <span className="block w-5 h-0.5 bg-current transition-all" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-paper-border bg-paper-warm px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-2.5 rounded-lg font-sans text-sm transition-colors ${
                pathname === link.href
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:text-ink hover:bg-paper-border/60"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <form action={logOut}>
              <button
                type="submit"
                className="w-full text-left px-4 py-2.5 rounded-lg font-sans text-sm text-ink-muted hover:text-ink hover:bg-paper-border/60 transition-colors"
              >
                Log out
              </button>
            </form>
          )}
        </div>
      )}
    </header>
  );
}

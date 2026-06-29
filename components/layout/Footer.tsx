"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { Github, Twitter, Facebook } from "@/components/ui/SocialIcons";
import { useLang } from "@/components/ui/LangProvider";
import { dict } from "@/lib/i18n";

export default function Footer() {
  const lang = useLang();
  const t = (k: keyof typeof dict.th) => dict[lang][k];

  const sections = [
    {
      label: t("footerSectionContent"),
      items: [
        { href: "/manga", label: t("footerAllTitles") },
        { href: "/discover", label: t("footerSearch") },
        { href: "/manga/action", label: "Action" },
        { href: "/download", label: t("footerAndroidApp") },
      ],
    },
    {
      label: t("footerSectionAccount"),
      items: [
        { href: "/auth/signin", label: t("footerSignIn") },
        { href: "/auth/signup", label: t("footerSignUp") },
        { href: "/creators", label: t("footerJoinCreators") },
        { href: "/services", label: t("footerServices") },
      ],
    },
    {
      label: t("footerSectionInfo"),
      items: [
        { href: "/about", label: t("footerAbout") },
        { href: "/terms", label: t("footerTerms") },
        { href: "/privacy", label: t("footerPrivacy") },
        { href: "/dmca", label: "DMCA" },
      ],
    },
  ];

  return (
    <footer className="bg-[var(--bg-primary)] border-t border-[var(--border)] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
              {t("footerTagline")}
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Github, href: "#", label: "Github" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="p-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/20 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {sections.map(({ label, items }) => (
            <div key={label}>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                {label}
              </h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} INKVERSE. All rights reserved.</p>
          <p>Built with Next.js · PostgreSQL · Cloudflare R2</p>
        </div>
      </div>
    </footer>
  );
}

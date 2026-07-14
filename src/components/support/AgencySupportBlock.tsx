"use client";

import { Headphones, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { EVENT } from "@/lib/config";

type Variant = "light" | "dark" | "compact";

interface Props {
  variant?: Variant;
  className?: string;
}

export function AgencySupportBlock({ variant = "light", className = "" }: Props) {
  const { t } = useI18n();

  const contactLine = t("support.contact")
    .replace("{name}", EVENT.agencySupportContact)
    .replace("{phone}", EVENT.agencySupportPhoneDisplay);

  if (variant === "compact") {
    return (
      <p className={`text-sm text-muted ${className}`}>
        {t("support.phoneHint")}{" "}
        <a
          href={`tel:${EVENT.agencySupportPhone}`}
          dir="ltr"
          className="text-gold hover:underline"
        >
          {EVENT.agencySupportContact} · {EVENT.agencySupportPhoneDisplay}
        </a>
      </p>
    );
  }

  const isDark = variant === "dark";

  return (
    <div
      className={
        isDark
          ? `glass rounded-2xl p-5 text-left ${className}`
          : `rounded-xl border border-navy/10 bg-aegean/5 px-4 py-4 ${className}`
      }
    >
      <p
        className={`flex items-center gap-2 text-sm font-medium ${
          isDark ? "text-gold-light" : "text-navy"
        }`}
      >
        <Headphones className="h-4 w-4 shrink-0" />
        {t("support.title")}
      </p>
      <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-cream/80" : "text-navy/80"}`}>
        {t("support.body")}
      </p>
      <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-cream/70" : "text-muted"}`}>
        {contactLine}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${
            isDark ? "text-cream/60" : "text-muted"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {t("support.whatsapp")}
        </span>
        <a
          href={`tel:${EVENT.agencySupportPhone}`}
          dir="ltr"
          className={`inline-flex items-center gap-1.5 text-xs transition hover:underline ${
            isDark ? "text-gold-light" : "text-gold"
          }`}
        >
          <Phone className="h-3.5 w-3.5" />
          {t("support.call").replace("{name}", EVENT.agencySupportContact)}
        </a>
      </div>
    </div>
  );
}

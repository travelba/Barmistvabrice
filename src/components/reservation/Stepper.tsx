"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const STEP_KEYS = ["steps.participants", "steps.hotel", "steps.rooms", "steps.recap"];

export function Stepper({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <ol className="mx-auto flex max-w-3xl items-center justify-between gap-1">
      {STEP_KEYS.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} className="flex flex-1 flex-col items-center text-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition ${
                done
                  ? "border-gold bg-gold text-navy-deep"
                  : active
                    ? "border-gold bg-navy text-cream"
                    : "border-navy/20 bg-white text-muted"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`mt-2 hidden text-[0.7rem] sm:block ${
                active ? "font-semibold text-navy" : "text-muted"
              }`}
            >
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

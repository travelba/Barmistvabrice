"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

function diff(target: number) {
  const now = Date.now();
  const d = Math.max(0, target - now);
  return {
    days: Math.floor(d / 86_400_000),
    hours: Math.floor((d / 3_600_000) % 24),
    minutes: Math.floor((d / 60_000) % 60),
    seconds: Math.floor((d / 1000) % 60),
  };
}

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export function Countdown({
  target,
  variant = "new",
}: {
  target: string;
  variant?: "new" | "classic";
}) {
  const { t } = useI18n();
  const targetMs = new Date(target).getTime();
  // On rend zero au SSR + 1er rendu client pour eviter tout mismatch d'hydratation,
  // puis on demarre le compte a rebours apres le montage cote client.
  const [time, setTime] = useState(ZERO);

  useEffect(() => {
    setTime(diff(targetMs));
    const id = setInterval(() => setTime(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const cells: Array<[number, string]> = [
    [time.days, t("countdown.days")],
    [time.hours, t("countdown.hours")],
    [time.minutes, t("countdown.minutes")],
    [time.seconds, t("countdown.seconds")],
  ];

  if (variant === "classic") {
    return (
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        {cells.map(([value, label], i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="glass flex h-16 w-16 items-center justify-center rounded-xl sm:h-24 sm:w-24">
              <span className="font-serif text-3xl text-cream sm:text-5xl tabular-nums">
                {String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="kicker mt-2 text-[0.6rem] text-gold-light">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="std-countdown">
      {cells.map(([value, label], i) => (
        <div key={i} className="std-countdown-item">
          <span className="std-countdown-number">{String(value).padStart(2, "0")}</span>
          <span className="std-countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

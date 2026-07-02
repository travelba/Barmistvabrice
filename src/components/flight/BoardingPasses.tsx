"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { BoardingPass } from "./BoardingPass";
import { EVENT_THEME } from "@/lib/event-theme";
import { useI18n } from "@/i18n/I18nProvider";
import type { Passenger } from "@/lib/types";

interface Props {
  passengers: Passenger[];
  bookingRef: string;
}

export function BoardingPasses({ passengers, bookingRef }: Props) {
  const { t } = useI18n();
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all(
      passengers.map((p, i) =>
        QRCode.toDataURL(
          `TBPA|${bookingRef}|${i + 1}|${p.firstName} ${p.lastName}`,
          { margin: 0, width: 200, color: { dark: EVENT_THEME.accentDeep, light: EVENT_THEME.white } },
        ).catch(() => ""),
      ),
    ).then((urls) => {
      if (active) setCodes(urls);
    });
    return () => {
      active = false;
    };
  }, [passengers, bookingRef]);

  async function downloadOne(index: number, name: string) {
    const node = refs.current[index];
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `billet-${name.replace(/\s+/g, "-").toLowerCase() || "passager"}.png`;
      a.click();
    } catch (e) {
      console.error("[boarding-pass] download", e);
    }
  }

  return (
    <div className="space-y-6">
      {passengers.map((p, i) => {
        const name = `${p.firstName} ${p.lastName}`.trim();
        return (
          <div key={i} className="space-y-3">
            <div ref={(el) => { refs.current[i] = el; }} className="bg-cream p-1">
              <BoardingPass
                passengerName={name}
                dateOfBirth={p.dateOfBirth}
                bookingRef={bookingRef}
                seq={i + 1}
                codeSrc={codes[i]}
              />
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => downloadOne(i, name)}
                className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-5 py-2.5 text-sm text-cream/85 transition hover:bg-cream hover:text-navy"
              >
                <Download className="h-4 w-4" />{" "}
                {t("confirm.downloadTicketOf").replace(
                  "{name}",
                  name || t("confirm.thisPassenger"),
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

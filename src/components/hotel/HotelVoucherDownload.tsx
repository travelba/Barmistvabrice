"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { HotelVoucher } from "./HotelVoucher";

interface Props {
  hotelName: string;
  location?: string;
  stars?: number;
  photo?: string;
  rooms: Array<{ roomName: string; quantity: number; priceCents: number }>;
  roomsTotalCents: number;
  guestName: string;
  guestCount: number;
  bookingRef: string;
}

export function HotelVoucherDownload(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  async function download() {
    if (!ref.current) return;
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `confirmation-hotel-${props.hotelName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    } catch (e) {
      console.error("[hotel-voucher] download", e);
    }
  }

  return (
    <div className="space-y-3">
      <div ref={ref} className="bg-cream p-1">
        <HotelVoucher {...props} />
      </div>
      <div className="text-center">
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-5 py-2.5 text-sm text-cream/85 transition hover:bg-cream hover:text-navy"
        >
          <Download className="h-4 w-4" /> Télécharger la confirmation hôtel
        </button>
      </div>
    </div>
  );
}

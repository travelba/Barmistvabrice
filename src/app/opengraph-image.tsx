import { ImageResponse } from "next/og";
import { EVENT } from "@/lib/config";

export const alt = `${EVENT.title} — ${EVENT.destination}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SERIF_TEXT =
  "Bar Mitsvah de Shon Bechet Mykonos Octobre 2026 — · abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789éèà";

async function loadFraunces(): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,600&text=${encodeURIComponent(
      SERIF_TEXT,
    )}`;
    const css = await (await fetch(url)).text();
    const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const fraunces = await loadFraunces();
  const serif = fraunces ? "Fraunces" : "serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(150deg, #0e3a4f 0%, #0a2c3d 55%, #08222f 100%)",
          color: "#f4f1ea",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 38,
            left: 38,
            right: 38,
            bottom: 38,
            border: "1px solid rgba(216,203,171,0.35)",
            borderRadius: 6,
          }}
        />
        <div
          style={{
            fontSize: 24,
            letterSpacing: 14,
            textTransform: "uppercase",
            color: "#d8cbab",
            display: "flex",
          }}
        >
          Bar Mitsvah
        </div>
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 116,
            lineHeight: 1.05,
            marginTop: 18,
            color: "#f4f1ea",
            display: "flex",
          }}
        >
          Shon Bechet
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 30,
          }}
        >
          <div style={{ width: 70, height: 1, background: "rgba(216,203,171,0.6)" }} />
          <div
            style={{
              fontSize: 30,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#bcd4de",
              display: "flex",
            }}
          >
            Mykonos · 9–11 Octobre 2026
          </div>
          <div style={{ width: 70, height: 1, background: "rgba(216,203,171,0.6)" }} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 70,
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(244,241,234,0.55)",
            display: "flex",
          }}
        >
          Travel BA — Conciergerie de Luxe
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fraunces
        ? [{ name: "Fraunces", data: fraunces, style: "italic", weight: 600 }]
        : undefined,
    },
  );
}

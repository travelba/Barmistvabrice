import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a2c3d",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 152,
            height: 152,
            borderRadius: 32,
            border: "2px solid rgba(216,203,171,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 112,
              fontStyle: "italic",
              fontWeight: 600,
              color: "#d8cbab",
              fontFamily: "Georgia, 'Times New Roman', serif",
              marginTop: -8,
            }}
          >
            S
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

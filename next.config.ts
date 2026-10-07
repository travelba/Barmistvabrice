import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/bookings/voucher": ["./src/lib/pdf/fonts/**/*"],
  },
};

export default nextConfig;

import { NextResponse } from "next/server";

// Server-only route to help verify env vars during local dev.
// Returns masked values. In production this endpoint requires a
// matching VERIFY_TOKEN header for CI to safely verify injected secrets.
export async function GET(req) {
  // Allow in dev/unset env. In production require a header token.
  if (process.env.NODE_ENV === "production") {
    const token = req.headers.get("x-verify-token") || "";
    if (!process.env.VERIFY_TOKEN || token !== process.env.VERIFY_TOKEN) {
      return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
    }
  }

  const keys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "FIREBASE_API_KEY",
    "NEXT_PUBLIC_API_KEY",
    "DATABASE_PASSWORD",
    "DB_PASS",
  ];

  const env = {};
  keys.forEach((k) => {
    const v = process.env[k];
    if (!v) {
      env[k] = null;
      return;
    }
    // For client-visible keys, show a short prefix; for secrets, mask fully
    if (k.startsWith("NEXT_PUBLIC_")) {
      env[k] = v.length > 8 ? `${v.slice(0, 8)}...` : v;
    } else {
      env[k] = "***masked***";
    }
  });

  return NextResponse.json({ env });
}

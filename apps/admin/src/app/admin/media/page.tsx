import { headers } from "next/headers";
import { MediaClient } from "./media-client";

export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  status: "ready" | "pending" | "failed";
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
  caption: string | null;
  folder: string | null;
  tags: string[];
  url: string;
  variants: MediaVariant[];
  createdAt: string;
}

export interface MediaVariant {
  format: string;
  url: string;
  width: number;
  height: number;
}

async function fetchMedia(cookie?: string): Promise<MediaAsset[]> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    const res = await fetch(`${API}/api/media?limit=50`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    if (!(res.headers.get("content-type") ?? "").includes("application/json")) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function MediaPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const assets = await fetchMedia(cookie);
  return <MediaClient initialAssets={assets} />;
}

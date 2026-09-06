import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/** Sajikan video hero tanpa path .mp4 publik — kurangi interception IDM. */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "videos", "scissors-hero.mp4");
    const data = await readFile(filePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(data.byteLength),
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video tidak ditemukan" }, { status: 404 });
  }
}

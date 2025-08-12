import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "edge"; // opsional, biar cepat

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename =
      file.name?.trim() ||
      `surat-penawaran-${Date.now().toString().slice(-6)}.pdf`;

    // Upload ke Vercel Blob dengan akses publik
    const { url } = await put(filename, file, { access: "public" });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, SUPABASE_BUCKET } from "@/lib/supabaseServer";
import { getAdminCookie, isAdmin } from "@/lib/adminAuth";
import { getPool } from "@/lib/db";

export const config = {
  api: { bodyParser: false },
};

async function readFormData(req: NextApiRequest): Promise<{ lotId: string; file: File }> {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  const url = `http://${req.headers.host}/api/admin/upload`;

  // ВАЖНО: добавить duplex: "half"
  const r = new Request(url, {
    method: "POST",
    headers: req.headers as any,
    body: req as any,
    // @ts-ignore – в типах RequestInit ещё нет duplex, но Node 18 его требует
    duplex: "half",
  } as any);

  const fd = await r.formData();

  const lotId = String(fd.get("lotId") || "");
  const file = fd.get("file");

  if (!lotId) throw new Error("lotId is required");
  // в Node нет глобального File, поэтому просто проверяем наличие метода arrayBuffer
  if (!file || typeof (file as any).arrayBuffer !== "function") {
    throw new Error("file is required");
  }

  return { lotId, file: file as any };


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // проверка админа
    const token = getAdminCookie(req as any);
const ok = await isAdmin(token);

    if (!ok) return res.status(403).json({ error: "Нет доступа" });

    const { lotId, file } = await readFormData(req);

    // путь в бакете
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `lots/${lotId}/${Date.now()}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());

    const up = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(path, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (up.error) throw up.error;

    // публичный URL из Supabase
    const pub = supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(path);
    const url = pub.data.publicUrl;

    // 🔴 ВАЖНО: сохраняем URL в таблицу lots.images
    const pool = getPool();
    await pool.query(
      `UPDATE lots SET images = $1, updated_at = now() WHERE id = $2`,
      [url, Number(lotId)]
    );

    return res.status(200).json({ ok: true, url, path });
  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return res
      .status(500)
      .json({ error: e?.message ? e.message : String(e) });
  }
}




import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, SUPABASE_BUCKET } from "@/lib/supabaseServer";
import { getAdminCookie, isAdmin } from "@/lib/adminAuth";

export const config = {
  api: { bodyParser: false },
};

async function readFormData(req: NextApiRequest): Promise<{ lotId: string; file: File }> {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  // В Next 14 (pages API) удобно использовать Web API: Request.formData()
  // Собираем URL (он не используется реально, но нужен конструктору Request)
  const url = `http://${req.headers.host}/api/admin/upload`;
  const r = new Request(
  url,
  {
    method: "POST",
    headers: req.headers as any,
    body: req as any,
    // duplex нужен Node/undici, в типах его пока нет
    duplex: "half",
  } as any
);

  const fd = await r.formData();

  const lotId = String(fd.get("lotId") || "");
  const file = fd.get("file");

  if (!lotId) throw new Error("lotId is required");
  if (!(file instanceof File)) throw new Error("file is required");

  return { lotId, file };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Проверка админ-доступа (как у тебя уже сделано в админке)
    const token = getAdminCookie(req as any);
const ok = await isAdmin(token);
if (!ok) return res.status(401).json({ error: "unauthorized" });

    const { lotId, file } = await readFormData(req);

    // имя файла в bucket
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

    // публичная ссылка
    const pub = supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    const url = pub.data.publicUrl;

    return res.status(200).json({ ok: true, url, path });
  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return res.status(500).json({ error: e?.message ? e.message : String(e) });
  }
}



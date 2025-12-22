import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, SUPABASE_BUCKET } from "@/lib/supabaseServer";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPool } from "@/lib/db";


export const config = {
  api: { bodyParser: false },
};

async function readFormData(req: NextApiRequest): Promise<{ lotId: string; file: any }> {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  // Создаём Web Request для formData()
  const url = `http://${req.headers.host}/api/admin/upload`;
  const webReq = new Request(url, {
    method: "POST",
    headers: req.headers as any,
    body: req as any,
    // @ts-ignore для duplex
    duplex: "half",
  });

  const fd = await webReq.formData();

  const lotId = String(fd.get("lotId") || "");
  const file = fd.get("file");

  if (!lotId) throw new Error("lotId is required");
  if (!file || typeof (file as any).arrayBuffer !== "function") {
    throw new Error("file is required");
  }

  return { lotId, file: file as any };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // проверка доступа
    const ok = await isAdminRequest(req);
    if (!ok) return res.status(403).json({ error: "Нет доступа" });

    const { lotId, file } = await readFormData(req);

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

    const pub = supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
    const url = pub.data.publicUrl;
    const pool = getPool();
const lotIdNum = Number(lotId);

await pool.query(
  `
  UPDATE lots
  SET images = 
    CASE 
      WHEN images IS NULL OR images = '' THEN $2
      ELSE images || E'\n' || $2
    END
  WHERE id = $1
  `,
  [lotIdNum, url]
);

return res.status(200).json({ ok: true, url, path });

    return res.status(200).json({ ok: true, url, path });
  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return res.status(500).json({ error: e?.message ?? String(e) });
  }
}



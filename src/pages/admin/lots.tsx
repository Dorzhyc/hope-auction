import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(async r => {
  if (!r.ok) throw new Error(await r.text());
  return r.json();
});

function UploadLotImage({ lotId, onDone }: { lotId: number; onDone: () => Promise<any> }) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function upload() {
    if (!file) return setMsg("Выбери файл");

    setMsg("Загрузка...");
    const fd = new FormData();
    fd.append("lotId", String(lotId));
    fd.append("file", file);

   // заставляем TypeScript «забыть» про типы fetch
const r = await (fetch as any)("/api/admin/upload", {
  method: "POST",
  body: fd,
  duplex: "half",
});


    const j = await r.json();

    if (!r.ok) {
      setMsg(j?.error || "Ошибка");
      return;
    }

    setMsg("Готово ✅");
    setFile(null);
    await onDone();
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #ddd" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Фото лота</div>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={upload} style={{ marginLeft: 8 }}>Загрузить</button>
      {msg ? <div style={{ marginTop: 6 }}>{msg}</div> : null}
    </div>
  );
}

export default function AdminLots() {
  const { data, mutate } = useSWR("/api/admin/lots", fetcher);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startPrice, setStartPrice] = useState("5000");
  const [msg, setMsg] = useState<string | null>(null);

  async function createLot(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/lots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, start_price: Number(startPrice) })
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || "Ошибка");
    else { setMsg("Лот создан"); setTitle(""); setDescription(""); await mutate(); }
  }

  async function toggleStatus(id: number, status: string) {
    await fetch(`/api/admin/lots/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    await mutate();
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Лоты</h1>
      <p><Link href="/admin">← назад</Link></p>

      <h2>Создать лот</h2>
      <form onSubmit={createLot} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} required rows={5} />
        <input placeholder="Стартовая цена (₽)" value={startPrice} onChange={e => setStartPrice(e.target.value)} required />
        <button>Создать</button>
        {msg && <div>{msg}</div>}
      </form>

      <h2 style={{ marginTop: 18 }}>Список</h2>
      {!data ? <p>Загрузка...</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {data.lots.map((l: any) => (
            <div key={l.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{l.title} (#{l.id})</div>
              <div>Старт: {l.start_price} ₽ · Текущая: {l.current_price} ₽ · Ставок: {l.bids_count}</div>
              <div>Статус: <b>{l.status}</b></div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => toggleStatus(l.id, l.status === "hidden" ? "active" : "hidden")}>
                  {l.status === "hidden" ? "Показать" : "Скрыть"}
                </button>
                <button onClick={() => toggleStatus(l.id, "ended")}>Завершить лот</button>
              </div>

              <UploadLotImage lotId={l.id} onDone={mutate} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

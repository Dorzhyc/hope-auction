import useSWR from "swr";
import Link from "next/link";
import { useEffect, useState } from "react";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error("unauthorized");
    return r.json();
  });

// "2026-01-07T00:00" (из input datetime-local) -> "2026-01-07T00:00:00+03:00"
function mskLocalToIsoWithOffset(mskLocal: string) {
  // mskLocal может быть "" если не выбрано
  if (!mskLocal) return "";
  // добавим секунды, если их нет
  const withSeconds = mskLocal.length === 16 ? `${mskLocal}:00` : mskLocal;
  return `${withSeconds}+03:00`;
}

export default function AdminAuction() {
  const { data, mutate, error } = useSWR("/api/admin/auction", fetcher);

  const [endsAt, setEndsAt] = useState(""); // значение из datetime-local: "YYYY-MM-DDTHH:mm"
  const [msg, setMsg] = useState<string | null>(null);

  // (не обязательно, но удобно) при загрузке данных можно подсказать текущее значение
  // data.ends_at_msk у тебя вида "06.01.2026 21:00", поэтому автоматически в datetime-local
  // корректно не преобразуем без парсинга; оставим поле пустым, чтобы не ломать.
  useEffect(() => {
    setMsg(null);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const ends_at = mskLocalToIsoWithOffset(endsAt);
    if (!ends_at) {
      setMsg("Выбери дату и время");
      return;
    }

    const r = await fetch("/api/admin/auction", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ends_at }),
    });

    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) {
      setMsg(j?.error || "Ошибка сохранения");
      return;
    }

    setMsg("Сохранено ✅");
    await mutate();
  }

  async function toggleActive() {
    setMsg(null);
    await fetch("/api/admin/auction/toggle", { method: "POST" });
    await mutate();
  }

  async function finalize() {
    setMsg(null);
    const r = await fetch("/api/admin/auction/finalize", { method: "POST" });
    const j = await r.json().catch(() => ({} as any));
    setMsg(r.ok ? "Победители зафиксированы ✅" : (j.error || "Ошибка"));
    await mutate();
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Настройки аукциона</h1>
      <p><Link href="/admin">← назад</Link></p>

      {error && <p style={{ color: "crimson" }}>Нет доступа</p>}

      {!data ? (
        <p>Загрузка...</p>
      ) : (
        <>
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div><b>Окончание (МСК):</b> {data.ends_at_msk}</div>
            <div><b>is_active:</b> {String(data.is_active)}</div>
            <div><b>winners_finalized:</b> {String(data.winners_finalized)}</div>
          </div>

          <h2 style={{ marginTop: 16 }}>Изменить окончание</h2>

          <form onSubmit={save} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
            <button>Сохранить</button>
            <small>Это время считается МСК и сохранится в базу как ISO с +03:00.</small>
          </form>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={toggleActive}>
              {data.is_active ? "Закрыть приём ставок" : "Открыть приём ставок"}
            </button>
            <button onClick={finalize}>Зафиксировать победителей</button>
          </div>

          {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        </>
      )}
    </main>
  );
}

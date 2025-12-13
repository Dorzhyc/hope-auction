import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(async r => {
  if (!r.ok) throw new Error("unauthorized");
  return r.json();
});

export default function AdminHome() {
  const { data, mutate, error } = useSWR("/api/admin/me", fetcher);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });
    const j = await r.json();
    if (!r.ok) setMsg(j.error || "Ошибка");
    else { setMsg("Вход выполнен"); setPassword(""); await mutate(); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    await mutate();
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
        <h1>Админ</h1>
        <p>Войдите паролем администратора.</p>
        <form onSubmit={login} style={{ display: "grid", gap: 8, maxWidth: 360 }}>
          <input type="password" placeholder="ADMIN_PASSWORD" value={password} onChange={e => setPassword(e.target.value)} />
          <button>Войти</button>
          {msg && <div>{msg}</div>}
          {error && <div style={{ color: "crimson" }}>Нет доступа</div>}
        </form>
        <p><Link href="/">← на сайт</Link></p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Админ-панель</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div>Вы вошли как админ.</div>
        <button onClick={logout}>Выйти</button>
      </div>

      <h2 style={{ marginTop: 16 }}>Разделы</h2>
      <ul>
        <li><Link href="/admin/lots">Лоты (CRUD)</Link></li>
        <li><Link href="/admin/auction">Настройки аукциона</Link></li>
        <li><Link href="/admin/log">Журнал событий</Link></li>
        <li><Link href="/api/admin/export/winners.csv">Скачать победителей CSV</Link></li>
      </ul>

      <p><Link href="/">← на сайт</Link></p>
    </main>
  );
}

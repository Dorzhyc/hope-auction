import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(async r => {
  if (!r.ok) throw new Error("unauthorized");
  return r.json();
});

export default function AdminLog() {
  const { data } = useSWR("/api/admin/log", fetcher, { refreshInterval: 5000 });

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Журнал событий</h1>
      <p><Link href="/admin">← назад</Link></p>

      {!data ? <p>Загрузка...</p> : (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", padding: 10, background: "#fafafa", fontWeight: 700 }}>
            <div>Время</div><div>Действие</div><div>Детали</div>
          </div>
          {data.items.map((x: any) => (
            <div key={x.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", padding: 10, borderTop: "1px solid #eee" }}>
              <div>{x.time_msk}</div>
              <div>{x.action}</div>
              <div><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(x.payload, null, 2)}</pre></div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

import Link from "next/link";

// ─── Tip Tanımı ──────────────────────────────────────────────────────────────
// Her seans kaydının şeklini TypeScript'e bildiriyoruz.
// "status" için union type: sadece bu üç değerden biri olabilir.
interface Session {
  id: string;
  patientId: string;
  patientName: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  duration: number;   // dakika
  topic: string;
  status: "Planlandı" | "Tamamlandı" | "İptal";
}

// ─── Mock Veri ────────────────────────────────────────────────────────────────
// Gerçek API hazır olduğunda bu dizi silinir,
// yerine fetch("/api/sessions") kullanılır.
const sessions: Session[] = [
  { id: "s1", patientId: "p1", patientName: "Ayşe Yılmaz",    date: "2026-03-14", time: "10:00", duration: 50, topic: "İlerleme Değerlendirmesi", status: "Planlandı"   },
  { id: "s2", patientId: "p2", patientName: "Mehmet Kaya",    date: "2026-03-14", time: "11:30", duration: 50, topic: "Stres Yönetimi",           status: "Planlandı"   },
  { id: "s3", patientId: "p3", patientName: "Zeynep Arslan",  date: "2026-03-15", time: "14:00", duration: 50, topic: "Travma Sonrası Stres",     status: "Planlandı"   },
  { id: "s4", patientId: "p1", patientName: "Ayşe Yılmaz",    date: "2026-03-07", time: "10:00", duration: 50, topic: "Kaygı Yönetimi",           status: "Tamamlandı"  },
  { id: "s5", patientId: "p4", patientName: "Can Demir",      date: "2026-03-06", time: "15:00", duration: 50, topic: "Depresyon Takibi",         status: "Tamamlandı"  },
  { id: "s6", patientId: "p2", patientName: "Mehmet Kaya",    date: "2026-03-05", time: "11:30", duration: 50, topic: "Bilişsel Yeniden Yapılanma", status: "Tamamlandı" },
  { id: "s7", patientId: "p5", patientName: "Elif Şahin",     date: "2026-03-04", time: "09:00", duration: 50, topic: "İlk Görüşme",              status: "Tamamlandı"  },
  { id: "s8", patientId: "p3", patientName: "Zeynep Arslan",  date: "2026-03-01", time: "14:00", duration: 50, topic: "Aile Terapisi",            status: "İptal"       },
];

// ─── Renk Haritası ────────────────────────────────────────────────────────────
// Her duruma karşılık gelen Tailwind class'larını bir objede tutuyoruz.
// Böylece JSX içinde if/else yazmak yerine statusColors[session.status] diyebiliyoruz.
const statusColors: Record<Session["status"], string> = {
  Planlandı:  "bg-blue-100 text-blue-700",
  Tamamlandı: "bg-emerald-100 text-emerald-700",
  İptal:      "bg-red-100 text-red-600",
};

// ─── İsim → Baş Harfler ───────────────────────────────────────────────────────
// "Ayşe Yılmaz" → "AY"
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

// ─── Sayfa Bileşeni ───────────────────────────────────────────────────────────
export default function SessionsPage() {
  // Seansları "Planlandı" ve "geçmiş" olarak ikiye ayırıyoruz.
  // filter() diziden koşulu sağlayan elemanları seçer.
  const upcoming = sessions.filter((s) => s.status === "Planlandı");
  const past     = sessions.filter((s) => s.status !== "Planlandı");

  // İstatistikler: dizinin uzunluğunu veya reduce() ile hesaplıyoruz.
  const thisWeekCount = sessions.filter((s) => {
    // Bu haftanın pazartesisini bul, seans o tarihten sonraysa say
    const d = new Date(s.date);
    const now = new Date("2026-03-12"); // today (mock)
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return d >= monday && s.status === "Tamamlandı";
  }).length;

  return (
    <div className="space-y-6">

      {/* ── Sayfa Başlığı ── */}
      {/* justify-between ile başlık sola, buton sağa itilir */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Seanslar</h2>
          <p className="text-sm text-slate-500">
            Tüm seans geçmişi ve planlamaları
          </p>
        </div>
        <Link
          href="/therapist/sessions/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Yeni Seans
        </Link>
      </div>

      {/* ── 4 İstatistik Kartı ── */}
      {/* grid ile yan yana sıralanır; küçük ekranlarda 2 sütun, büyüklerde 4 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Bu Hafta</p>
          <p className="mt-1 text-2xl font-bold">{thisWeekCount}</p>
          <p className="text-xs text-slate-400">tamamlanan seans</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Toplam</p>
          <p className="mt-1 text-2xl font-bold">{sessions.length}</p>
          <p className="text-xs text-slate-400">tüm zamanlar</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Yaklaşan</p>
          <p className="mt-1 text-2xl font-bold">{upcoming.length}</p>
          <p className="text-xs text-slate-400">planlanmış seans</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">İptal</p>
          <p className="mt-1 text-2xl font-bold">
            {sessions.filter((s) => s.status === "İptal").length}
          </p>
          <p className="text-xs text-slate-400">bu ay</p>
        </div>
      </section>

      {/* ── Yaklaşan Seanslar ── */}
      {/* Eğer upcoming dizisi boşsa bu bölümü hiç render etmiyoruz (&&) */}
      {upcoming.length > 0 && (
        <section className="rounded-lg border bg-white">
          {/* Kart başlığı */}
          <div className="border-b px-4 py-3">
            <h3 className="font-semibold">Yaklaşan Seanslar</h3>
          </div>

          {/* Seans satırları: divide-y her satırın altına ince bir çizgi koyar */}
          <div className="divide-y">
            {upcoming.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      {/* ── Geçmiş Seanslar ── */}
      <section className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Geçmiş Seanslar</h3>
        </div>
        <div className="divide-y">
          {past.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Seans Satırı Alt Bileşeni ────────────────────────────────────────────────
// Her seans için tekrar eden satır yapısını ayrı bir bileşene çıkardık.
// Props olarak tek bir Session objesi alır.
function SessionRow({ session }: { session: Session }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">

      {/* Sol: Avatar + Hasta adı + konu */}
      <div className="flex items-center gap-3">
        {/* Küçük avatar — hasta detail sayfasındakinin minyatürü */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {initials(session.patientName)}
        </div>
        <div>
          <p className="text-sm font-medium">{session.patientName}</p>
          <p className="text-xs text-slate-500">{session.topic}</p>
        </div>
      </div>

      {/* Sağ: Tarih + süre + durum badge + detay linki */}
      <div className="flex items-center gap-4 text-right">
        <div className="hidden sm:block">
          <p className="text-sm">{session.date}</p>
          <p className="text-xs text-slate-500">
            {session.time} · {session.duration} dk
          </p>
        </div>
        {/* Durum badge'i: statusColors objesinden renk sınıfını alıyoruz */}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[session.status]}`}
        >
          {session.status}
        </span>
        <Link
          href={`/therapist/sessions/${session.id}`}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          Detay →
        </Link>
      </div>

    </div>
  );
}

import Link from "next/link";

// Mock data — gerçek API entegrasyonunda params.id ile çekilecek
const mockPatient = {
  id: "p1",
  name: "Ayşe Yılmaz",
  email: "ayse.yilmaz@email.com",
  phone: "+90 532 123 45 67",
  age: 28,
  startDate: "2025-09-12",
  diagnosis: "Anksiyete Bozukluğu",
  risk: "Düşük" as "Düşük" | "Orta" | "Yüksek",
  sessionCount: 14,
  lastSession: "2026-03-07",
  nextSession: "2026-03-14",
  homeworkCompletion: 78,
  notes: [
    {
      id: "n1",
      date: "2026-03-07",
      content:
        "Danışan bu seansta kaygı tetikleyicilerini daha net tanımlamaya başladı. Nefes egzersizlerine devam etmesi önerildi.",
    },
    {
      id: "n2",
      date: "2026-02-28",
      content:
        "İş yerinde stres kaynaklı uyku problemleri rapor edildi. Uyku hijyeni protokolü paylaşıldı.",
    },
    {
      id: "n3",
      date: "2026-02-14",
      content:
        "Bilişsel yeniden yapılandırma tekniklerine odaklanıldı. Ödev olarak düşünce günlüğü verildi.",
    },
  ],
  sessions: [
    { id: "s1", date: "2026-03-07", duration: 50, status: "Tamamlandı", topic: "Kaygı Yönetimi" },
    { id: "s2", date: "2026-02-28", duration: 50, status: "Tamamlandı", topic: "Uyku Problemleri" },
    { id: "s3", date: "2026-02-14", duration: 50, status: "Tamamlandı", topic: "Bilişsel Yeniden Yapılanma" },
    { id: "s4", date: "2026-03-14", duration: 50, status: "Planlandı", topic: "İlerleme Değerlendirmesi" },
  ],
  homework: [
    { id: "h1", title: "Düşünce Günlüğü", dueDate: "2026-03-12", status: "Teslim Edildi" },
    { id: "h2", title: "Nefes Egzersizi (Günde 2x)", dueDate: "2026-03-14", status: "Devam Ediyor" },
    { id: "h3", title: "Kaygı Tetikleyici Listesi", dueDate: "2026-02-28", status: "Teslim Edildi" },
  ],
};

const riskColors: Record<"Düşük" | "Orta" | "Yüksek", string> = {
  Düşük: "bg-emerald-100 text-emerald-700",
  Orta: "bg-amber-100 text-amber-700",
  Yüksek: "bg-red-100 text-red-700",
};

const homeworkStatusColors: Record<string, string> = {
  "Teslim Edildi": "bg-emerald-100 text-emerald-700",
  "Devam Ediyor": "bg-blue-100 text-blue-700",
  "Gecikmiş": "bg-red-100 text-red-700",
};

const sessionStatusColors: Record<string, string> = {
  Tamamlandı: "bg-slate-100 text-slate-600",
  Planlandı: "bg-blue-100 text-blue-700",
  İptal: "bg-red-100 text-red-600",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // params.id ile gerçek API'den veri çekilir; şimdilik mock
  const patient = mockPatient;
  const upcomingSessions = patient.sessions.filter((s) => s.status === "Planlandı");
  const pastSessions = patient.sessions.filter((s) => s.status !== "Planlandı");

  return (
    <div className="space-y-6">
      {/* Geri butonu */}
      <Link
        href="/therapist/patients"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        ← Danışan Listesi
      </Link>

      {/* Hasta Başlığı */}
      <section className="rounded-lg border bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
              {initials(patient.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{patient.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[patient.risk]}`}
                >
                  {patient.risk} Risk
                </span>
              </div>
              <p className="text-sm text-slate-500">{patient.diagnosis}</p>
              <p className="text-xs text-slate-400">
                {patient.email} · {patient.phone}
              </p>
            </div>
          </div>

          {/* Hızlı aksiyonlar */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/therapist/sessions/new?patient=${params.id}`}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Seans Planla
            </Link>
            <Link
              href={`/therapist/messages/${params.id}`}
              className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              Mesaj Gönder
            </Link>
            <Link
              href={`/therapist/homework/new?patient=${params.id}`}
              className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
            >
              Ödev Ver
            </Link>
          </div>
        </div>
      </section>

      {/* İstatistik Kartları */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Toplam Seans</p>
          <p className="mt-1 text-2xl font-bold">{patient.sessionCount}</p>
          <p className="text-xs text-slate-400">
            Başlangıç: {patient.startDate}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Son Seans</p>
          <p className="mt-1 text-2xl font-bold">{patient.lastSession}</p>
          <p className="text-xs text-slate-400">50 dakika</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Sonraki Seans</p>
          <p className="mt-1 text-2xl font-bold">{patient.nextSession}</p>
          <p className="text-xs text-slate-400">Planlandı</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-slate-500">Ödev Tamamlama</p>
          <p className="mt-1 text-2xl font-bold">%{patient.homeworkCompletion}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-emerald-500"
              style={{ width: `${patient.homeworkCompletion}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sol sütun: Seanslar + Ödevler */}
        <div className="space-y-6 lg:col-span-2">
          {/* Yaklaşan Seanslar */}
          {upcomingSessions.length > 0 && (
            <section className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">Yaklaşan Seanslar</h3>
              </div>
              <div className="divide-y">
                {upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.topic}</p>
                      <p className="text-xs text-slate-500">
                        {s.date} · {s.duration} dk
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${sessionStatusColors[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Geçmiş Seanslar */}
          <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Geçmiş Seanslar</h3>
              <Link
                href={`/therapist/sessions?patient=${params.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Tümünü Gör
              </Link>
            </div>
            <div className="divide-y">
              {pastSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{s.topic}</p>
                    <p className="text-xs text-slate-500">
                      {s.date} · {s.duration} dk
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${sessionStatusColors[s.status]}`}
                    >
                      {s.status}
                    </span>
                    <Link
                      href={`/therapist/sessions/${s.id}`}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Detay →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ödevler */}
          <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Ödevler</h3>
              <Link
                href={`/therapist/homework?patient=${params.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Tümünü Gör
              </Link>
            </div>
            <div className="divide-y">
              {patient.homework.map((hw) => (
                <div
                  key={hw.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{hw.title}</p>
                    <p className="text-xs text-slate-500">
                      Son tarih: {hw.dueDate}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      homeworkStatusColors[hw.status] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {hw.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sağ sütun: Notlar */}
        <div className="space-y-6">
          <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Seans Notları</h3>
              <button className="text-xs text-blue-600 hover:underline">
                + Not Ekle
              </button>
            </div>
            <div className="divide-y">
              {patient.notes.map((note) => (
                <div key={note.id} className="px-4 py-3">
                  <p className="mb-1 text-xs font-medium text-slate-400">
                    {note.date}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Hasta Bilgileri */}
          <section className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold">Hasta Bilgileri</h3>
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Yaş</span>
                <span>{patient.age}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tanı</span>
                <span>{patient.diagnosis}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Risk Seviyesi</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskColors[patient.risk]}`}
                >
                  {patient.risk}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Başlangıç Tarihi</span>
                <span>{patient.startDate}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

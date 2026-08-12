import Link from "next/link";

export default function TherapistDashboardPage() {
  const stats = [
    { label: "Toplam Danışan", value: "24" },
    { label: "Bugünkü Seans", value: "5" },
    { label: "Bekleyen Mesaj", value: "12" },
    { label: "Bekleyen Ödevler / Formlar:", value: "18" },
  ];
  
  return(
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Kontrol Paneli</h2>
        <p className="text-sm text-slate-600">Genel durumu buradan takip edebilirsin</p>
      </section>

      <section className= "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"> 
         {stats.map((item) => (
          <div key={item.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-white p-4" >
         <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Hızlı Erişim</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/patients" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
            Danışanlara Git
          </Link>
          <Link href="/sessions" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
            Seanslara Git
          </Link>
          <Link href="/messages" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
            Mesajlara Git
          </Link>
        </div>
      </section>



    </div>
  );
}
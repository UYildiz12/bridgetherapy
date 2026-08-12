import Link from "next/link";

const patients = [
  { id: "p1", name: "Ayşe Yılmaz", lastSession: "2026-03-07", risk: "Düşük" },
  { id: "p2", name: "Mehmet Demir", lastSession: "2026-03-08", risk: "Orta" },
  { id: "p3", name: "Zeynep Kaya", lastSession: "2026-03-05", risk: "Yüksek" },
];

export default function TherapistPatientsPage() {
  return(
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Danışanlar</h2>
        <p className="text-sm text-slate-600">Kayıtlı danışan listesini buradan yönetebilirsin.</p>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <p className="text-sm font-medium">Toplam: {patients.length}</p>
        </div>
      
        <div className="divide-y">
          {patients.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-slate-500">
                  Son seans: {p.lastSession} • Risk: {p.risk}
                </p>
              </div>

               <Link
                href={`/therapist/patients/${p.id}`}
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              >
                Detay
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
  
// bunu bi incele sonra oburune gec.
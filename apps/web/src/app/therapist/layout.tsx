import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Kontrol Paneli" },
  { href: "/patients", label: "Danışanlar" },
  { href: "/sessions", label: "Seanslar" },
  { href: "/homework", label: "Ödevler" },
  { href: "/messages", label: "Mesajlar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/billing", label: "Faturalar" },
  { href: "/resources", label: "Kaynaklar" },
  { href: "/audit", label: "Denetim" },
  { href: "/settings", label: "Ayarlar" },
];

export default function GroupLayout({ children }: { children: ReactNode }) {//
  //children, bu layout içine yerleştirilen sayfa içeriğini temsil eder.
  //ReactNode, React bileşenlerinin render edebileceği herhangi bir içeriği ifade eder.
    return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-white p-4 md:block">
          <h2 className="mb-6 text-lg font-semibold">Terapist Paneli</h2>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}//React için benzersiz kimlik
                href={item.href}/// Tıklanınca gidilecek adres (Örn: /patients)
                className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100"
              >
                {item.label} (Örn: Patients)
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="border-b bg-white px-6 py-4">
            <p className="text-sm text-slate-600">Tekrar hoş geldiniz</p>
            <h1 className="text-xl font-semibold"> Terapist Çalışma Alanı</h1>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
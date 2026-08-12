'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';


export default function ResetPasswordPage() {
  const searchParams = useSearchParams(); //once searchParams i tanimladik. URL üzerindeki soru işaretinden sonra gelen verileri okumanı sağlayan bir araçtır.
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
//useMemo, token değerini hesaplamak için kullanılır. searchParams.get('token') ifadesi, URL'deki token parametresinin değerini alır. Eğer token parametresi yoksa, varsayılan olarak boş bir string ('') döndürülür. useMemo, token değerini sadece searchParams değiştiğinde yeniden hesaplar, böylece gereksiz hesaplamaların önüne geçilir.

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();//formun varsayılan davranışını engeller, yani sayfanın yeniden yüklenmesini önler.
    setError(null); //set ler Önceki başarı/error mesajını temizler.
    setSuccess(null);

      if (!token) {
      setError('Geçersiz veya eksik sıfırlama bağlantısı.');
      return;
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }


    //API çağrısı kısmı
     try { //JavaScript’te bir hata yakalama yapısıdır. İçerideki kodda hata olursa catch çalışır.
      setLoading(true);

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({})); //Eğer cevap JSON değilse hata vermesin diye .catch(() => ({})) ile boş obje döndürür.

       if (!res.ok) {
        setError(data?.message ?? 'Şifre sıfırlama başarısız.');
        return;
      }

      setSuccess('Şifren başarıyla güncellendi. Giriş yapabilirsin.');
      setPassword('');
      setConfirmPassword('');
    } catch { // try icindeki beklenmedik hataalari catch yakalar ve hata mesaji verir.
      setError('Bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      setLoading(false); // loading, form submit’in “çalışıyor/çalışmıyor” anahtarıdır. api baslamadan true olur, islem bitince false. buton kilitlenir baska submit olmaz.
    }
  };
    return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Şifreyi Sıfırla</h1>
      <p className="mt-2 text-sm text-gray-600">
        Yeni şifreni belirleyerek hesabına tekrar erişebilirsin.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Yeni Şifre
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring"
            placeholder="En az 8 karakter"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Yeni Şifre (Tekrar)
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none focus:ring"
            placeholder="Şifreyi tekrar gir"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </main>
  );
}

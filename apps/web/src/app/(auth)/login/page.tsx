"use client"
import { useState } from "react"
import Link from "next/link"     
import { Button } from "@/components/ui/button" ;
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Moon, Sun } from "lucide-react";

export default function LoginPage() {
  // State'ler buraya
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"patient" | "therapist">("patient")
  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("auth-theme") === "dark",
  )

  // Dark mode'u toggle et
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem("auth-theme", newTheme ? "dark" : "light")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Giriş işlemi burada yapılacak
    console.log("Login attempt:", { email, password, role });
};
  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      isDark 
        ? "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" 
        : "bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100"
    } p-4`}>
      {/* Theme Toggle Butonu */}
      <button
        onClick={toggleTheme}
        className={`fixed top-8 right-8 p-2 rounded-lg transition-colors ${
          isDark
            ? "bg-blue-900 hover:bg-blue-800 text-yellow-300"
            : "bg-white text-blue-600 shadow-md hover:bg-blue-50"
        }`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <Card className={`w-full max-w-md shadow-lg border transition-colors ${
        isDark
          ? "border-blue-800 bg-slate-900"
          : "border-blue-200 bg-white"
      }`}>
        <div className={`p-8 space-y-6 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-serif font-bold text-blue-600">exhale</h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Hoş geldiniz! Lütfen giriş yaparak devam edin.
            </p>
          </div>

          {/* Role Toggle */}
          <div className={`flex gap-2 p-1 rounded-lg ${
            isDark ? "bg-slate-800" : "bg-blue-50"
          }`}>
            <button
              onClick={() => setRole("patient")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                role === "patient"
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 shadow-sm border border-blue-300"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Danışan
            </button>
            <button
              onClick={() => setRole("therapist")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                role === "therapist"
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 shadow-sm border border-blue-300"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Terapist
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                E-posta
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                }`}
                required
              />
            </div>

            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                Şifre
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                }`}
                required
              />
            </div>

            <Link href="/forgot-password" className={`text-sm font-medium block hover:underline transition-colors ${
              isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
            }`}>
              Şifremi unuttum?
            </Link>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 transition-colors"
            >
              Giriş Yap
            </Button>
          </form>

          {/* Footer */}
          <div className={`pt-6 border-t transition-colors ${isDark ? "border-slate-800" : "border-blue-200"} text-center`}>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Hesabın yok mu?{" "}
              <Link href="/register" className={`font-medium hover:underline transition-colors ${
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              }`}>
                Hesap oluştur
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

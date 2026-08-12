"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Moon, Sun } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isDark, setIsDark] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  // Dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem("auth-theme")
    if (savedTheme) {
      setIsDark(savedTheme === "dark")
    }
  }, [])

  // Validation
  const validateEmail = (): boolean => {
    if (!email) {
      setError("Email gereklidir")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Geçersiz email formatı")
      return false
    }
    setError("")
    return true
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateEmail()) {
      return
    }

    setIsSubmitting(true)
    console.log("Reset password request for:", email)

    // API call burada yapılacak
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
      setEmail("")
    }, 1000)
  }

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem("auth-theme", newTheme ? "dark" : "light")
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900"
        : "bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100"
    } p-4`}>
      {/* Theme Toggle */}
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
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-serif font-bold text-blue-600">exhale</h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              şifrenizi sıfırlayın
            </p>
          </div>

          {/* Success Message */}
          {isSuccess ? (
            <div className={`p-4 rounded-lg text-center space-y-4 ${
              isDark ? "bg-green-900/20 border border-green-700" : "bg-green-50 border border-green-200"
            }`}>
              <p className={`text-sm font-medium ${isDark ? "text-green-400" : "text-green-700"}`}>
                ✓ Reset linki email adresinize gönderildi
              </p>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Email'inizi kontrol edin ve linke tıklayarak şifrenizi sıfırlayın
              </p>
              <Link
                href="/login"
                className={`inline-block text-sm font-medium hover:underline transition-colors ${
                  isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                }`}
              >
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <>
              {/* Description */}
              <p className={`text-sm text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Email adresinizi giriniz. Size şifre sıfırlama linki göndereceğiz.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    isDark ? "text-slate-100" : "text-slate-900"
                  }`}>
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="siz@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError("")
                    }}
                    className={`w-full transition-colors ${
                      isDark
                        ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                        : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                    } ${error ? "border-red-500" : ""}`}
                    required
                  />
                  {error && (
                    <p className="text-red-500 text-xs">{error}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Gönderiliyor..." : "Reset Linki Gönder"}
                </Button>
              </form>
            </>
          )}

          {/* Footer */}
          <div className={`pt-6 border-t transition-colors ${isDark ? "border-slate-800" : "border-blue-200"} text-center`}>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Giriş sayfasına dön{" "}
              <Link href="/login" className={`font-medium hover:underline transition-colors ${
                isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
              }`}>
                Giriş yap
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
"use client"

// 1. Import'lar
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Moon, Sun } from "lucide-react"


interface FormData {
  email: string
  fullName: string
  password: string
  confirmPassword: string
  therapistCode?: string // Patient'in terapistle bağlanması için
}

interface Errors {
  [key: string]: string
}

export default function RegisterPage() {
  const [role, setRole] = useState<"patient" | "therapist">("patient")
  const [isDark, setIsDark] = useState(
    () => {
      if (typeof window === "undefined") return true
      const saved = window.localStorage.getItem("bridge-theme")
      return saved === "dark" || saved === null
    },
  )
  const [formData, setFormData] = useState<FormData>({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
    therapistCode: "",
  })
  const [errors, setErrors] = useState<Errors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Errors = {} //buldugumuz hatalari buraya yazacak

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email gereklidir"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Geçersiz email formatı"
    }

    // Name validation
    if (!formData.fullName) {
      newErrors.fullName = "İsim gereklidir"
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Şifre gereklidir"
    } else if (formData.password.length < 8) {
      newErrors.password = "Şifre en az 8 karakter olmalıdır"
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor"
    }

    // Therapist code for patient
    if (role === "patient" && !formData.therapistCode) {
      newErrors.therapistCode = "Terapist kodu gereklidir"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { //kullanici input yazarken calisan fonk
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    console.log("Register attempt:", { ...formData, role })


    // API call burada yapılacak
    setTimeout(() => {
      setIsSubmitting(false)
    }, 1000)
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    window.localStorage.setItem("bridge-theme", isDark ? "dark" : "light")
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((current) => !current)
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
            <h1 className="text-4xl font-serif font-bold text-blue-600">bridge</h1>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              hesap oluştur
            </p>
          </div>

          {/* Role Toggle */}
          <div className={`flex gap-2 p-1 rounded-lg ${
            isDark ? "bg-slate-800" : "bg-blue-50"
          }`}>
            <button
              onClick={() => {
                setRole("patient")
                setFormData(prev => ({ ...prev, therapistCode: "" }))
                setErrors({})
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                role === "patient"
                  ? isDark
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 shadow-sm border border-blue-300"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >Danışan</button>
            <button
              onClick={() => {
                setRole("therapist")
                setFormData(prev => ({ ...prev, therapistCode: "" }))
                setErrors({})
              }}
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
            {/* Full Name */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                Adınız Soyadınız
              </label>
              <Input
                type="text"
                name="fullName"
                placeholder="Ahmet Yılmaz"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                } ${errors.fullName ? "border-red-500" : ""}`}
                required
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                Email
              </label>
              <Input
                type="email"
                name="email"
                placeholder="siz@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                } ${errors.email ? "border-red-500" : ""}`}
                required
              />
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email}</p>
              )}
            </div>

            {/* Therapist Code (Patient only) */}
            {role === "patient" && (
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}>
                  Terapist Kodu
                </label>
                <p className={`text-xs mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Terapistinizden aldığınız kodu giriniz
                </p>
                <Input
                  type="text"
                  name="therapistCode"
                  placeholder="örn: THER-A1B2C3"
                  value={formData.therapistCode}
                  onChange={handleInputChange}
                  className={`w-full transition-colors uppercase ${
                    isDark
                      ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                      : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                  } ${errors.therapistCode ? "border-red-500" : ""}`}
                  required
                />
                {errors.therapistCode && (
                  <p className="text-red-500 text-xs">{errors.therapistCode}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                Şifre
              </label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                } ${errors.password ? "border-red-500" : ""}`}
                required
              />
              {errors.password && (
                <p className="text-red-500 text-xs">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}>
                Şifre Doğrula
              </label>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full transition-colors ${
                  isDark
                    ? "bg-slate-800 border-blue-700 text-white placeholder:text-slate-500"
                    : "bg-white border-blue-300 text-slate-900 placeholder:text-slate-400"
                } ${errors.confirmPassword ? "border-red-500" : ""}`}
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
            </Button>
          </form>

          {/* Footer */}
          <div className={`pt-6 border-t transition-colors ${isDark ? "border-slate-800" : "border-blue-200"} text-center`}>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Zaten hesabın var mı?{" "}
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

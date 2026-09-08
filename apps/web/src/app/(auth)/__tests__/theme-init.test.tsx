// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

import LoginPage from "../login/page"
import RegisterPage from "../register/page"

describe("manual theme initialization", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  afterEach(cleanup)

  it("applies the saved dark theme on login page", () => {
    localStorage.setItem("bridge-theme", "dark")
    const { container } = render(<LoginPage />)

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(container.querySelector("button.fixed")?.className).toContain("bg-blue-900")
  })

  it("applies the saved light theme on register page", () => {
    localStorage.setItem("bridge-theme", "light")
    const { container } = render(<RegisterPage />)

    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(container.querySelector("button.fixed")?.className).toContain("bg-white")
  })
})

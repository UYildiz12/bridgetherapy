// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import LoginPage from "../login/page"
import RegisterPage from "../register/page"

describe("auth theme initialization", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(cleanup)

  it("uses the saved dark theme on login page", () => {
    localStorage.setItem("auth-theme", "dark")
    const { container } = render(<LoginPage />)

    expect(container.querySelector("button.fixed")?.className).toContain("bg-blue-900")
  })

  it("uses the saved dark theme on register page", () => {
    localStorage.setItem("auth-theme", "dark")
    const { container } = render(<RegisterPage />)

    expect(container.querySelector("button.fixed")?.className).toContain("bg-blue-900")
  })
})

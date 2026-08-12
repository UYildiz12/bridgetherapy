// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const resetPasswordForEmail = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword, resetPasswordForEmail },
  }),
}));

describe("auth flow pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("signs in the user with Supabase on login", async () => {
    const LoginPage = (await import("../login/page")).default;
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret123",
    }));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("requests a reset email from the forgot-password page", async () => {
    const ForgotPasswordPage = (await import("../forgot-password/page")).default;
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledTimes(1));
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: expect.stringContaining("/reset-password"),
    });
  });
});

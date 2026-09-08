// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserLock } from "../browser-lock";

describe("BrowserLock", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "PublicKeyCredential", {
      configurable: true,
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
      },
    });
  });

  afterEach(cleanup);

  it("checks passkey/biometric availability and stores the local lock setting", async () => {
    render(<BrowserLock />);

    fireEvent.click(screen.getByRole("button", { name: /check this device/i }));

    await waitFor(() => screen.getByText(/passkey or biometric verification is available/i));

    fireEvent.click(screen.getByRole("button", { name: /enable browser lock/i }));

    expect(localStorage.getItem("bridge.security.browserLockEnabled")).toBe("true");
    expect(screen.getByRole("button", { name: /disable browser lock/i })).toBeDefined();
  });
});

import Link from "next/link";
import { BlueprintSvg } from "@/components/landing/blueprint-svg";
import { BlueprintSecondarySvg } from "@/components/landing/blueprint-secondary-svg";

// Shared shell for every auth-adjacent screen (login, signup, password reset):
// the blueprint backdrop plus the wordmark, with the page's card as children.
export function AuthChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-page" data-theme="dark">
      <BlueprintSvg />
      <BlueprintSecondarySvg />
      <div className="auth-shell">
        <Link href="/" className="auth-logo">
          <span className="auth-logo-badge" />
          exhale
        </Link>
        {children}
      </div>
    </div>
  );
}

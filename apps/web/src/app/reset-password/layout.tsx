import { AuthChrome } from "@/components/auth/auth-chrome";
import "../(auth)/auth.css";

// Deliberately outside the (auth) group: its layout redirects signed-in users
// to /dashboard, but the reset link signs the user in via the recovery code and
// they still need this page to set the new password.
export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthChrome>{children}</AuthChrome>;
}

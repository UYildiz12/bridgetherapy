import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">A calm space to check in with yourself.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/mood" className="no-underline">
          <Card className="transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle>Mood check-in</CardTitle>
              <CardDescription>Log how you feel and see your trend over time.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Takes about a minute →</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

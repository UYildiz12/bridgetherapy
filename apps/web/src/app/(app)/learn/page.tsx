import { BookOpen, Route } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CBT_LOOP, PSYCHOEDUCATION_MODULES } from "@/lib/education";

export default function LearnPage() {
  return (
    <div className="grid gap-10">
      <PageHeader
        title="Learn"
        sub="CBT-informed education to support the work you do with your therapist."
      />

      <section className="grid gap-6 border-b border-border pb-10 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Route className="size-4" aria-hidden="true" />
            CBT loop
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            A shared map for understanding patterns, not a diagnosis or replacement for care.
          </p>
        </div>
        <ol className="border-y border-border">
          {CBT_LOOP.map((step, index) => (
            <li key={step.label} className="grid gap-2 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[4rem_1fr]">
              <span className="text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-lg font-medium text-foreground">{step.label}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <BookOpen className="size-4" aria-hidden="true" />
            Psychoeducation modules
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Short modules can become homework when your therapist assigns them.
          </p>
        </div>
        <div className="border-y border-border">
          {PSYCHOEDUCATION_MODULES.map((module) => (
            <article key={module.title} className="border-b border-border/70 py-5 last:border-b-0">
              <p className="text-lg font-medium text-foreground">{module.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{module.format}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{module.focus}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

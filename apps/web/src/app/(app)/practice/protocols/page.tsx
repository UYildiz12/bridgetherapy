import { ClipboardCheck, Layers3 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CBT_PROTOCOLS } from "@/lib/education";

export default function ProtocolsPage() {
  return (
    <div className="grid gap-10">
      <PageHeader
        title="Protocols"
        sub="Treatment-planning templates for structured CBT homework and session follow-through."
      />

      <section className="grid gap-6 border-b border-border pb-10 lg:grid-cols-[12rem_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <Layers3 className="size-4" aria-hidden="true" />
            Library
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Protocols stay therapist-led and can be adapted before anything is assigned to a patient.
          </p>
        </div>
        <div className="border-y border-border">
          {CBT_PROTOCOLS.map((protocol) => (
            <article key={protocol.title} className="grid gap-4 border-b border-border/70 py-5 last:border-b-0 md:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="text-lg font-medium text-foreground">{protocol.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{protocol.useFor}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  {protocol.therapistReviewed}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Homework sequence</p>
                <ol className="mt-3 grid gap-2">
                  {protocol.homeworkSequence.map((step, index) => (
                    <li key={step} className="grid grid-cols-[2rem_1fr] gap-3 text-sm text-muted-foreground">
                      <span className="text-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";
import { useMemo } from "react";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { fetchProgressReport, type ExportRow, type ProgressReport } from "@/lib/reports-client";
import { useSwrLite } from "@/lib/swr-lite";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { BlueprintTrend } from "@/components/app/blueprint-trend";
import { StatBand } from "@/components/app/stat-band";
import { Skeleton } from "@/components/ui/skeleton";

const SERIF = { fontFamily: "var(--font-instrument-serif), serif" } as const;

function csvHref(rows: ExportRow[]) {
  const csv = ["Metric,Value", ...rows.map((row) => `"${row.metric}","${row.value}"`)].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function formatMetric(value: number | null, suffix = "") {
  return value === null ? "n/a" : `${value}${suffix}`;
}

/** Baseline-to-current rail: hollow marker for where you started, filled for now. */
function MeasureRail({ baseline, current }: { baseline: number | null; current: number | null }) {
  if (baseline === null || current === null) return null;
  const max = Math.max(baseline, current, 1) * 1.25;
  const pos = (v: number) => `${(v / max) * 100}%`;
  return (
    <div aria-hidden className="relative mt-4 h-px w-full bg-foreground/15 sm:max-w-md">
      {[0, 25, 50, 75, 100].map((p) => (
        <span
          key={p}
          className="absolute top-[-2px] h-[5px] w-px bg-foreground/20"
          style={{ left: `${p}%` }}
        />
      ))}
      <span
        className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/70 bg-background"
        style={{ left: pos(baseline) }}
      />
      <span
        className="absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
        style={{ left: pos(current) }}
      />
    </div>
  );
}

export default function ReportsPage() {
  const { data: report, error } = useSwrLite<ProgressReport>(
    "progress-report",
    fetchProgressReport,
  );

  const patientRows = useMemo(() => (report?.role === "PATIENT" ? report.exportRows : []), [report]);

  const trendPoints = useMemo(() => {
    if (report?.role !== "PATIENT" || report.mood.entries.length < 2) return [];
    const asc = [...report.mood.entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const recent = asc.slice(-14);
    return recent.map((e, i) => ({
      value: e.moodScore,
      label:
        i === 0 || i === recent.length - 1
          ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
              new Date(e.createdAt),
            )
          : undefined,
    }));
  }, [report]);

  return (
    <div className="grid gap-10">
      <PageHeader
        title="Progress reports"
        sub="How the work is adding up: mood, homework, and formal measures."
        action={
          patientRows.length > 0 ? (
            <Button asChild variant="outline">
              <a href={csvHref(patientRows)} download="bridge-progress.csv">
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
          ) : undefined
        }
      />

      {error && !report && (
        <p role="alert" className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!report && !error && (
        <div className="grid gap-8" aria-busy="true">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {report?.role === "PATIENT" && (
        <>
          <StatBand
            ariaLabel="Key metrics"
            items={[
              { label: "Mood average", value: formatMetric(report.mood.average) },
              {
                label: "Mood change",
                value: formatMetric(
                  report.mood.delta === null ? null : Math.abs(report.mood.delta),
                ),
                icon:
                  report.mood.delta === null || report.mood.delta === 0 ? undefined : report.mood.delta > 0 ? (
                    <TrendingUp className="size-4" aria-hidden />
                  ) : (
                    <TrendingDown className="size-4" aria-hidden />
                  ),
              },
              {
                label: "Homework completion",
                value: formatMetric(report.homework.completionRate, "%"),
              },
              { label: "Reflections", value: String(report.reflections.total) },
            ]}
          />

          {trendPoints.length >= 2 && (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl">Mood over time</h2>
                <p className="text-xs text-muted-foreground">
                  Last {trendPoints.length} check-ins, scored 1 to 10
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <BlueprintTrend points={trendPoints} />
              </div>
            </section>
          )}

          <section className="grid gap-4">
            <div className="grid gap-1">
              <h2 className="text-xl">Formal measures</h2>
              <p className="max-w-prose text-sm text-muted-foreground">
                Self-report measures give session work a clearer baseline and trend. The hollow
                marker is where you started; the filled one is where you are now.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {report.measures.map((measure, i) => (
                <div
                  key={measure.name}
                  className={`grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center ${
                    i > 0 ? "border-t border-white/10" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-baseline gap-3">
                      <p className="font-medium">{measure.name}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {measure.trend}
                      </p>
                    </div>
                    <MeasureRail baseline={measure.baseline} current={measure.current} />
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Baseline</p>
                      <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                        {formatMetric(measure.baseline)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current</p>
                      <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                        {formatMetric(measure.current)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Change</p>
                      <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                        {formatMetric(measure.changeFromBaseline)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {report?.role === "THERAPIST" && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {report.patients.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">No active patients yet.</p>
          )}
          {report.patients.map((patient, i) => (
            <div
              key={patient.patientId}
              className={`grid gap-4 px-5 py-5 md:grid-cols-[1fr_7rem_7rem_9rem_9rem] ${
                i > 0 ? "border-t border-white/10" : ""
              }`}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-medium">{patient.patientName}</h2>
                <p className="truncate text-sm text-muted-foreground">{patient.patientEmail}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mood</p>
                <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                  {formatMetric(patient.moodAverage)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Homework</p>
                <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                  {patient.homeworkCompletionRate}%
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Measure</p>
                <p className="mt-1 text-sm">{patient.measureTrend}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reflections</p>
                <p className="mt-1 text-xl leading-none tabular-nums" style={SERIF}>
                  {patient.reflectionCount}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

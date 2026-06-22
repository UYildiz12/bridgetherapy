"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { fetchProgressReport, type ExportRow, type ProgressReport } from "@/lib/reports-client";
import { Button } from "@/components/ui/button";

function csvHref(rows: ExportRow[]) {
  const csv = ["Metric,Value", ...rows.map((row) => `"${row.metric}","${row.value}"`)].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function formatMetric(value: number | null, suffix = "") {
  return value === null ? "n/a" : `${value}${suffix}`;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressReport()
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load reports."));
  }, []);

  const patientRows = useMemo(() => (report?.role === "PATIENT" ? report.exportRows : []), [report]);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Outcomes</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Progress reports</h1>
        </div>
        {patientRows.length > 0 && (
          <Button asChild variant="outline">
            <a href={csvHref(patientRows)} download="exhale-progress.csv">
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
        )}
      </div>

      {error && <p className="rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!report && !error && <p className="text-sm text-muted-foreground">Loading progress report...</p>}

      {report?.role === "PATIENT" && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              ["Mood average", formatMetric(report.mood.average)],
              ["Mood change", formatMetric(report.mood.delta)],
              ["Homework completion", formatMetric(report.homework.completionRate, "%")],
              ["Session attendance", formatMetric(report.sessions.attendanceRate, "%")],
              ["Reflections", String(report.reflections.total)],
            ].map(([label, value]) => (
              <section key={label} className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
              </section>
            ))}
          </div>

          <section className="grid gap-5 border-y border-border py-5 md:grid-cols-[13rem_1fr]">
            <div>
              <h2 className="text-sm font-medium">Formal measures</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Self-report measures give session work a clearer baseline and trend.
              </p>
            </div>
            <div className="divide-y divide-border">
              {report.measures.map((measure) => (
                <div key={measure.name} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_7rem_7rem_8rem]">
                  <div>
                    <p className="font-medium">{measure.name}</p>
                    <p className="text-sm text-muted-foreground">{measure.trend}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current</p>
                    <p className="mt-1 font-medium">{formatMetric(measure.current)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Baseline</p>
                    <p className="mt-1 font-medium">{formatMetric(measure.baseline)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Change</p>
                    <p className="mt-1 font-medium">{formatMetric(measure.changeFromBaseline)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {report?.role === "THERAPIST" && (
        <div className="divide-y divide-border border-y border-border">
          {report.patients.length === 0 && <p className="py-6 text-sm text-muted-foreground">No active patients yet.</p>}
          {report.patients.map((patient) => (
            <section key={patient.patientId} className="grid gap-4 py-5 md:grid-cols-[1fr_8rem_8rem_8rem_10rem]">
              <div>
                <h2 className="font-medium tracking-tight">{patient.patientName}</h2>
                <p className="text-sm text-muted-foreground">{patient.patientEmail}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mood</p>
                <p className="mt-1 font-medium">{formatMetric(patient.moodAverage)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Homework</p>
                <p className="mt-1 font-medium">{patient.homeworkCompletionRate}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session</p>
                <p className="mt-1 font-medium">{patient.sessionAttendanceRate}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Measure</p>
                <p className="mt-1 font-medium">{patient.measureTrend}</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{patient.reflectionCount} reflections</span>
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

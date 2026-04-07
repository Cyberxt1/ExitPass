"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, QrCode, ScanLine } from "lucide-react";

type PreviewRow = {
  label: string;
  value: string;
  accent?: boolean;
};

type PreviewStage = {
  title: string;
  text: string;
};

export function PassPreviewPhone({
  eyebrow,
  title,
  summary,
  badge = "Live",
  rows,
  stages,
  screenshotSrc,
  screenshotAlt = "ExitPass preview screenshot",
}: {
  eyebrow: string;
  title: string;
  summary: string;
  badge?: string;
  rows: PreviewRow[];
  stages: PreviewStage[];
  screenshotSrc?: string;
  screenshotAlt?: string;
}) {
  const [showScreenshot, setShowScreenshot] = useState(Boolean(screenshotSrc));

  useEffect(() => {
    setShowScreenshot(Boolean(screenshotSrc));
  }, [screenshotSrc]);

  return (
    <div className="relative flex justify-center">
      <div className="absolute inset-x-6 top-4 h-16 rounded-full bg-[#90cbf8]/25 blur-3xl" />
      <div className="relative h-[430px] w-[220px] rounded-[2.5rem] border border-white/15 bg-[linear-gradient(145deg,#1a2744_0%,#0d1c38_60%,#081221_100%)] p-3 shadow-[0_40px_120px_-50px_rgba(0,0,0,0.95),0_12px_28px_rgba(90,172,240,0.12)]">
        <div className="absolute left-1/2 top-0 h-3 w-20 -translate-x-1/2 rounded-b-2xl bg-black/80" />
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/6 bg-[linear-gradient(180deg,#0d1e3d_0%,#091426_100%)] px-4 py-5">
          {showScreenshot && screenshotSrc ? (
            <img
              src={screenshotSrc}
              alt={screenshotAlt}
              className="h-full w-full rounded-[1.6rem] object-cover"
              onError={() => setShowScreenshot(false)}
            />
          ) : (
            <>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[0.55rem] uppercase tracking-[0.28em] text-[#7a94b0]">{eyebrow}</p>
              <p className="mt-1 text-sm font-semibold text-white">{title}</p>
            </div>
            <div className="rounded-full border border-[#90cbf8]/25 bg-[#5aacf0]/15 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[#90cbf8]">
              {badge}
            </div>
          </div>

          <div className="rounded-3xl border border-[#90cbf8]/20 bg-[linear-gradient(135deg,rgba(10,23,52,0.92),rgba(6,14,31,0.98))] p-4">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-[#90cbf8]">Student Pass</p>
            <p className="mt-3 text-[0.92rem] font-semibold leading-6 text-white">{summary}</p>
            <div className="mt-4 space-y-3 text-[0.72rem] text-[#ccdcee]">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/4 px-3 py-2"
                >
                  <span>{row.label}</span>
                  <span className={`font-semibold ${row.accent ? "text-[#90cbf8]" : "text-white"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {stages.map((stage) => (
              <div key={stage.title} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.2em] text-[#7a94b0]">
                  <span>{stage.title}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#90cbf8]" />
                </div>
                <p className="mt-2 text-[0.75rem] text-[#ccdcee]">{stage.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-center gap-3 pt-5">
            <CircleIcon>
              <Bell className="h-4 w-4" />
            </CircleIcon>
            <CircleIcon>
              <QrCode className="h-4 w-4" />
            </CircleIcon>
            <CircleIcon>
              <ScanLine className="h-4 w-4" />
            </CircleIcon>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CircleIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-[#ccdcee]">
      {children}
    </div>
  );
}

import { MarketingShell } from '@/components/marketing-shell';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <MarketingShell compact>
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">About ExitPass</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          A calmer way to coordinate student movement.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
          ExitPass is designed to reduce friction between students, residence administration,
          chaplaincy oversight, and campus security. Instead of treating approvals as scattered
          handoffs, the product keeps them in a single parallel flow with visible status and QR-backed verification.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ['Students', 'Request a pass quickly, track status, and carry a live digital pass instead of paper.'],
          ['Staff', 'Approve or reject with context, history, and auditability already attached.'],
          ['Security', 'Verify at the gate with a simple QR check and a reliable log trail.'],
        ].map(([title, copy]) => (
          <Card key={title} className="border-white/70 bg-white/75">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </MarketingShell>
  );
}

import Link from 'next/link';

import { MarketingShell } from '@/components/marketing-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HelpPage() {
  return (
    <MarketingShell compact>
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Help</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Get unstuck without the back-and-forth.
        </h1>
        <p className="mt-6 text-base leading-8 text-slate-600">
          If you are having trouble accessing your account, seeing the wrong role, or using a pass at the gate,
          start with the most relevant path below.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Card className="border-white/70 bg-white/75">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Access issues</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Use password reset first. If your email is not recognized, contact your residence admin.
            </p>
            <Button asChild variant="ghost" className="mt-4 px-0 hover:bg-transparent">
              <Link href="/forgot-password">Reset password</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/75">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Approval issues</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              If a request is stuck, share your matric number, request window, and destination with the relevant staff office.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/75">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Gate scan issues</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Confirm the pass is still approved and within the valid time range before contacting security support.
            </p>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}

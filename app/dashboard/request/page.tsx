'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import {
  DetailBlock,
  PageHero,
  SectionCard,
  StatusBadge,
} from '@/components/platform-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api-service';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { formatDateTime, getPassTypeLabel } from '@/lib/platform';
import type { PassType } from '@/lib/types';

const passTypes: Array<{
  value: PassType;
  title: string;
  description: string;
}> = [
  {
    value: 'short',
    title: 'Short pass',
    description: 'Quick movement for same-day errands and appointments.',
  },
  {
    value: 'long',
    title: 'Long pass',
    description: 'Multi-day movement with a clearly planned return time.',
  },
  {
    value: 'holiday',
    title: 'Holiday pass',
    description: 'Extended leave with a more deliberate approval trail.',
  },
];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function RequestPassPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    type: 'short' as PassType,
    destination: '',
    reason: '',
    departureDate: todayDate(),
    departureTime: '09:00',
    returnDate: todayDate(),
    returnTime: '17:00',
  });

  useEffect(() => {
    if (!isLoading && user?.role !== 'student') {
      navigate(getDefaultRouteForRole(user?.role));
    }
  }, [user?.role, isLoading, navigate]);

  const departureDateTime = useMemo(
    () => new Date(`${formData.departureDate}T${formData.departureTime}`),
    [formData.departureDate, formData.departureTime],
  );

  const returnDateTime = useMemo(
    () => new Date(`${formData.returnDate}T${formData.returnTime}`),
    [formData.returnDate, formData.returnTime],
  );

  const validationMessage = useMemo(() => {
    if (!formData.destination.trim() || !formData.reason.trim()) {
      return 'Complete your destination and reason to continue.';
    }

    if (Number.isNaN(departureDateTime.getTime()) || Number.isNaN(returnDateTime.getTime())) {
      return 'Choose valid departure and return times.';
    }

    if (returnDateTime <= departureDateTime) {
      return 'Return time must be after departure time.';
    }

    return '';
  }, [departureDateTime, formData.destination, formData.reason, returnDateTime]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiService.submitPassRequest({
        studentId: user!.id,
        type: formData.type,
        destination: formData.destination.trim(),
        reason: formData.reason.trim(),
        departureDate: departureDateTime,
        expectedReturnDate: returnDateTime,
      });

      setSubmitted(true);
      window.setTimeout(() => {
        navigate('/dashboard');
      }, 1800);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user?.role !== 'student') {
    return null;
  }

  if (submitted) {
    return (
      <DashboardShell title="Request New Pass" contentClassName="mx-auto max-w-5xl">
        <SectionCard title="Request submitted" description="Your pass request is now in the approval flow.">
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">Request submitted</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Chaplaincy reviews first, then hall admin gives the final decision.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                Return to dashboard
              </Button>
            </div>
          </div>
        </SectionCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Request New Pass" contentClassName="mx-auto max-w-7xl">
      <div className="space-y-6">
        <PageHero
          eyebrow="Request"
          title="New pass request"
          description="Enter your destination, reason, and travel time."
          actions={
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            title="Pass details"
            description="Choose the type and fill in the trip details."
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Pass type</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {passTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData((current) => ({ ...current, type: type.value }))}
                      className={`rounded-[1.5rem] border p-4 text-left transition ${
                        formData.type === type.value
                          ? 'brand-selected'
                          : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <p className="font-semibold text-slate-950">{type.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Destination</label>
                  <Input
                    placeholder="Where are you going?"
                    value={formData.destination}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, destination: event.target.value }))
                    }
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Reason</label>
                  <Textarea
                    placeholder="Explain why you need to leave campus."
                    value={formData.reason}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, reason: event.target.value }))
                    }
                    disabled={isSubmitting}
                    className="min-h-32 rounded-[1.5rem] border-slate-200 bg-white/80"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Departure date</label>
                  <Input
                    type="date"
                    min={todayDate()}
                    value={formData.departureDate}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        departureDate: event.target.value,
                        returnDate:
                          event.target.value > current.returnDate
                            ? event.target.value
                            : current.returnDate,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Departure time</label>
                  <Input
                    type="time"
                    value={formData.departureTime}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, departureTime: event.target.value }))
                    }
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Return date</label>
                  <Input
                    type="date"
                    min={formData.departureDate}
                    value={formData.returnDate}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, returnDate: event.target.value }))
                    }
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Return time</label>
                  <Input
                    type="time"
                    value={formData.returnTime}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, returnTime: event.target.value }))
                    }
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className="flex gap-3 rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
                  <p className="text-sm leading-6 text-rose-700">{error}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isSubmitting || Boolean(validationMessage)}
                  className="brand-cta h-12 flex-1 rounded-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting request...
                    </>
                  ) : (
                    'Submit request'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="h-12 rounded-full border-white/80 bg-white/80 text-slate-900 hover:bg-white"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              title="Live summary"
              description="Preview before you submit."
            >
              <div className="space-y-4">
                <div className="brand-panel-soft rounded-[1.75rem] border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Selected pass
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">
                        {getPassTypeLabel(formData.type)}
                      </p>
                    </div>
                    <StatusBadge label="Ready to review" tone="border-blue-200 bg-blue-50 text-blue-800" />
                  </div>
                </div>

                <DetailBlock
                  label="Destination"
                  value={
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-1 h-4 w-4 text-slate-500" />
                      <span>{formData.destination || 'Add where you are going.'}</span>
                    </div>
                  }
                />
                <DetailBlock
                  label="Departure"
                  value={formatDateTime(Number.isNaN(departureDateTime.getTime()) ? undefined : departureDateTime.toISOString())}
                />
                <DetailBlock
                  label="Return"
                  value={formatDateTime(Number.isNaN(returnDateTime.getTime()) ? undefined : returnDateTime.toISOString())}
                />
                <DetailBlock
                  label="Reason"
                  value={formData.reason || 'Explain the purpose of this trip for reviewers.'}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Approval path"
              description="Review steps."
            >
              <div className="space-y-3">
                {[
                  ['Chaplaincy', 'First review.'],
                  ['Hall admin', 'Final decision.'],
                  ['QR pass', 'Ready after approval.'],
                ].map(([step, copy], index) => (
                  <div key={step} className="flex gap-4 rounded-[1.25rem] border border-white/70 bg-slate-50/80 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{step}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Before you submit" description="Quick checks.">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <div className="flex gap-3 rounded-[1.25rem] border border-white/70 bg-slate-50/80 p-4">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p>Set a realistic return time.</p>
                </div>
                <div className="flex gap-3 rounded-[1.25rem] border border-white/70 bg-slate-50/80 p-4">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <p>Use a clear destination and reason.</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

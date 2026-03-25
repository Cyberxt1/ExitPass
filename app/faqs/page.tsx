import { MarketingShell } from '@/components/marketing-shell';
import { Card, CardContent } from '@/components/ui/card';

const faqs = [
  {
    question: 'Who can create an account?',
    answer: 'Students can create their own accounts from the signup page. Staff roles should be provisioned through the admin workflow.',
  },
  {
    question: 'How do approvals work?',
    answer: 'A student submits a request, the relevant staff role reviews it, and an approved request becomes a QR-backed digital pass.',
  },
  {
    question: 'What happens at the gate?',
    answer: 'Security verifies the QR code and the system checks whether the pass is valid for the active time window.',
  },
  {
    question: 'Can I reset my password myself?',
    answer: 'Yes. Use the forgot-password page and Firebase will send a reset email to the address on your account.',
  },
  {
    question: 'Where is my data stored?',
    answer: 'Authentication, profile records, requests, passes, notifications, and scan logs are stored and enforced in Firebase.',
  },
  {
    question: 'What if my account is missing profile details?',
    answer: 'Use the Help page and contact your residence or system administrator with your matric number and registered email.',
  },
];

export default function FaqsPage() {
  return (
    <MarketingShell compact>
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">FAQs</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Common questions, answered directly.
        </h1>
      </div>

      <div className="mt-12 grid gap-4">
        {faqs.map((item) => (
          <Card key={item.question} className="border-white/70 bg-white/75">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">{item.question}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </MarketingShell>
  );
}

"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

import { MarketingShell } from '@/components/marketing-shell';
import { useAuth } from '@/lib/auth-context';
import { getDefaultRouteForRole } from '@/lib/firebase/auth';
import { apiService } from '@/lib/api-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Hostel } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    matric: '',
    department: '',
    level: '',
    hostel: '',
    room: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hostels, setHostels] = useState<Hostel[]>([]);

  useEffect(() => {
    void apiService
      .getHostels()
      .then((items) => setHostels(items))
      .catch(() => setHostels([]));
  }, []);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const profile = await signup({
        name: formData.name,
        email: formData.email,
        matric: formData.matric,
        department: formData.department,
        level: formData.level,
        hostel: formData.hostel,
        room: formData.room,
        password: formData.password,
      });
      router.push(getDefaultRouteForRole(profile.role));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MarketingShell compact>
      <div className="mx-auto flex min-h-[78vh] max-w-3xl items-center justify-center">
        <Card className="w-full border-white/80 bg-white/80 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold text-slate-950">Create student account</CardTitle>
            <CardDescription className="text-base text-slate-500">
              Set up your profile once and use the same account for requests, pass history, and QR access.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name">
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ada Okafor"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="student@school.edu"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Matric number">
                  <Input
                    value={formData.matric}
                    onChange={(e) => handleChange('matric', e.target.value)}
                    placeholder="2024/001"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Department">
                  <Input
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="Computer Science"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Level">
                  <Input
                    value={formData.level}
                    onChange={(e) => handleChange('level', e.target.value)}
                    placeholder="200"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Hostel">
                  {hostels.length > 0 ? (
                    <select
                      value={formData.hostel}
                      onChange={(e) => handleChange('hostel', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-950"
                      disabled={isLoading}
                      required
                    >
                      <option value="">Select hostel</option>
                      {hostels.map((hostel) => (
                        <option key={hostel.id} value={hostel.name}>
                          {hostel.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={formData.hostel}
                      onChange={(e) => handleChange('hostel', e.target.value)}
                      placeholder="Hall A"
                      className="border-slate-200 bg-white/70"
                      disabled={isLoading}
                      required
                    />
                  )}
                </Field>
                <Field label="Room">
                  <Input
                    value={formData.room}
                    onChange={(e) => handleChange('room', e.target.value)}
                    placeholder="301"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Repeat your password"
                    className="border-slate-200 bg-white/70"
                    disabled={isLoading}
                    required
                  />
                </Field>
              </div>

              {error && (
                <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-slate-950">
                Log in
              </Link>
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Staff account?{' '}
              <Link href="/staff-join" className="font-medium text-slate-950">
                Use staff join
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </MarketingShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

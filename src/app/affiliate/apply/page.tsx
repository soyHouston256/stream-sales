'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function AffiliateApplicationPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [applicationNote, setApplicationNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (applicationNote.length < 10) {
      setError('Application note must be at least 10 characters');
      return;
    }

    if (applicationNote.length > 500) {
      setError('Application note must be less than 500 characters');
      return;
    }

    try {
      setIsSubmitting(true);

      const token = tokenManager.getToken();
      const response = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationNote }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err: any) {
      console.error('Application error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t('affiliate.application.loginRequired')}</CardTitle>
            <CardDescription>{t('affiliate.application.loginRequiredMessage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              {t('affiliate.application.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>{t('affiliate.application.successTitle')}</CardTitle>
            </div>
            <CardDescription>{t('affiliate.application.successSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('affiliate.application.successMessage')}
            </p>
            <Alert>
              <AlertDescription>
                {t('affiliate.application.redirecting')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-12 px-4">
      {/* Language Selector - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('affiliate.application.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('affiliate.application.subtitle')}
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">{t('affiliate.application.benefit1Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.application.benefit1Description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">{t('affiliate.application.benefit2Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.application.benefit2Description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">{t('affiliate.application.benefit3Title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.application.benefit3Description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('affiliate.application.formTitle')}</CardTitle>
            <CardDescription>
              {t('affiliate.application.formSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">{t('affiliate.application.questionLabel')}</Label>
                <Textarea
                  id="note"
                  placeholder={t('affiliate.application.questionPlaceholder')}
                  value={applicationNote}
                  onChange={(e) => setApplicationNote(e.target.value)}
                  rows={6}
                  minLength={10}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('affiliate.application.characterCount').replace('{count}', applicationNote.length.toString())}
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  {t('affiliate.application.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('affiliate.application.submitting')}
                    </>
                  ) : (
                    t('affiliate.application.submitApplication')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Alert className="mt-6">
          <AlertDescription>
            <strong>{t('affiliate.application.noteTitle')}</strong> {t('affiliate.application.noteDescription')}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

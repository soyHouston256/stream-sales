'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Eye, UserPlus, TrendingUp, Lightbulb, Mail, Share2, MessageSquare, Percent } from 'lucide-react';
import {
  useAffiliateInfo,
  useMarketingTemplates,
  useMarketingStats,
} from '@/lib/hooks';
import {
  ReferralCodeCard,
  ReferralTextTemplate,
} from '@/components/affiliate';
import { StatCard } from '@/components/ui/stat-card';
import { calculateConversionRate } from '@/lib/utils/affiliate';

export default function MarketingPage() {
  const { t, language } = useLanguage();
  const { data: affiliateInfo, isLoading: infoLoading } = useAffiliateInfo();
  const { data: templates, isLoading: templatesLoading } = useMarketingTemplates(language);
  const { data: stats, isLoading: statsLoading } = useMarketingStats();

  const conversionRate = stats
    ? calculateConversionRate(stats.registrations, stats.linkViews)
    : 0;

  // Group templates by category
  const emailTemplates = templates?.filter((t) => t.category === 'email') || [];
  const socialTemplates = templates?.filter((t) => t.category === 'social') || [];
  const messageTemplates = templates?.filter((t) => t.category === 'message') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('affiliate.marketing.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('affiliate.marketing.subtitle')}
        </p>
      </div>

      {/* Referral Materials */}
      {infoLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : affiliateInfo ? (
        <ReferralCodeCard
          code={affiliateInfo.referralCode}
          link={affiliateInfo.referralLink}
        />
      ) : null}

      {/* Conversion Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('affiliate.marketing.conversionStats')}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t('affiliate.marketing.trackPerformance')}</p>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <StatCard
            label={t('affiliate.marketing.linkViews')}
            value={stats?.linkViews || 0}
            description={t('affiliate.marketing.linkViewsDesc')}
            icon={Eye}
            color="blue"
            isLoading={statsLoading}
          />

          <StatCard
            label={t('affiliate.marketing.registrations')}
            value={stats?.registrations || 0}
            description={t('affiliate.marketing.registrationsDesc')}
            icon={UserPlus}
            color="green"
            isLoading={statsLoading}
          />

          <StatCard
            label={t('affiliate.marketing.conversionRate')}
            value={`${conversionRate}%`}
            description={t('affiliate.marketing.conversionRateDesc')}
            icon={Percent}
            color="orange"
            isLoading={statsLoading}
          />
        </div>

        {/* Conversion Progress Bar */}
        {stats && stats.linkViews > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{t('affiliate.marketing.conversionProgress')}</span>
                  <span className="font-semibold">{stats.registrations} / {stats.linkViews}</span>
                </div>
                <Progress value={conversionRate} className="h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        {!stats && !statsLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('affiliate.marketing.noStats')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Templates Section */}
      <div className="space-y-6">
        {/* Email Templates */}
        {emailTemplates.length > 0 && affiliateInfo && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>{t('affiliate.marketing.emailTemplates')}</CardTitle>
                  <CardDescription>{t('affiliate.marketing.emailTemplatesDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {emailTemplates.map((template) => (
                  <ReferralTextTemplate
                    key={template.id}
                    template={template}
                    variables={{
                      code: affiliateInfo.referralCode,
                      link: affiliateInfo.referralLink,
                      name: 'there',
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Templates */}
        {socialTemplates.length > 0 && affiliateInfo && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Share2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>{t('affiliate.marketing.socialTemplates')}</CardTitle>
                  <CardDescription>{t('affiliate.marketing.socialTemplatesDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {socialTemplates.map((template) => (
                  <ReferralTextTemplate
                    key={template.id}
                    template={template}
                    variables={{
                      code: affiliateInfo.referralCode,
                      link: affiliateInfo.referralLink,
                      name: 'there',
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Templates */}
        {messageTemplates.length > 0 && affiliateInfo && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>{t('affiliate.marketing.messageTemplates')}</CardTitle>
                  <CardDescription>{t('affiliate.marketing.messageTemplatesDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {messageTemplates.map((template) => (
                  <ReferralTextTemplate
                    key={template.id}
                    template={template}
                    variables={{
                      code: affiliateInfo.referralCode,
                      link: affiliateInfo.referralLink,
                      name: 'there',
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Loading state for templates */}
      {templatesLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      )}

      {/* Best Practices */}
      <Card className="border-2 border-yellow-200 dark:border-yellow-900/30 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-950/20 dark:to-amber-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <Lightbulb className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-xl">{t('affiliate.marketing.bestPractices')}</CardTitle>
              <CardDescription>{t('affiliate.marketing.tipsToMaximize')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border-2 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1.5">{t('affiliate.marketing.beAuthentic')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.marketing.beAuthenticDesc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border-2 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1.5">{t('affiliate.marketing.targetAudience')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.marketing.targetAudienceDesc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border-2 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1.5">{t('affiliate.marketing.useMultipleChannels')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.marketing.useMultipleChannelsDesc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border-2 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-orange-100 dark:bg-orange-900 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-orange-600 dark:bg-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1.5">{t('affiliate.marketing.provideValue')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.marketing.provideValueDesc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border-2 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-pink-100 dark:bg-pink-900 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-pink-600 dark:bg-pink-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1.5">{t('affiliate.marketing.followUp')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.marketing.followUpDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('affiliate.marketing.faq')}</CardTitle>
          <CardDescription>{t('affiliate.marketing.faqDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold mb-2 text-base flex items-start gap-2">
                <span className="text-primary mt-0.5">Q:</span>
                <span>{t('affiliate.marketing.faqQ1')}</span>
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A:</span> {t('affiliate.marketing.faqA1')}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold mb-2 text-base flex items-start gap-2">
                <span className="text-primary mt-0.5">Q:</span>
                <span>{t('affiliate.marketing.faqQ2')}</span>
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A:</span> {t('affiliate.marketing.faqA2')}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold mb-2 text-base flex items-start gap-2">
                <span className="text-primary mt-0.5">Q:</span>
                <span>{t('affiliate.marketing.faqQ3')}</span>
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A:</span> {t('affiliate.marketing.faqA3')}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold mb-2 text-base flex items-start gap-2">
                <span className="text-primary mt-0.5">Q:</span>
                <span>{t('affiliate.marketing.faqQ4')}</span>
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">A:</span> {t('affiliate.marketing.faqA4')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Alert className="border-2 border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <AlertDescription className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-medium text-emerald-900 dark:text-emerald-100">
            {t('affiliate.marketing.ctaMessage')}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}

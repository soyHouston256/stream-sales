'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Eye, UserPlus, TrendingUp, Lightbulb, Mail, Share2, MessageSquare } from 'lucide-react';
import {
  useAffiliateInfo,
  useMarketingTemplates,
  useMarketingStats,
} from '@/lib/hooks';
import {
  ReferralCodeCard,
  ReferralTextTemplate,
} from '@/components/affiliate';
import { calculateConversionRate } from '@/lib/utils/affiliate';

export default function MarketingPage() {
  const { t } = useLanguage();
  const { data: affiliateInfo, isLoading: infoLoading } = useAffiliateInfo();
  const { data: templates, isLoading: templatesLoading } = useMarketingTemplates();
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
      <Card>
        <CardHeader>
          <CardTitle>{t('affiliate.marketing.conversionStats')}</CardTitle>
          <CardDescription>{t('affiliate.marketing.trackPerformance')}</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{t('affiliate.marketing.linkViews')}</span>
                  </div>
                  <div className="text-3xl font-bold">{stats.linkViews}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="text-sm">{t('affiliate.marketing.registrations')}</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{stats.registrations}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">{t('affiliate.marketing.conversionRate')}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{conversionRate}%</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('affiliate.marketing.conversionProgress')}</span>
                  <span className="font-medium">{stats.registrations} / {stats.linkViews}</span>
                </div>
                <Progress value={conversionRate} className="h-2" />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('affiliate.marketing.noStats')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Templates */}
      {emailTemplates.length > 0 && affiliateInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t('affiliate.marketing.emailTemplates')}</h2>
          </div>
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
        </div>
      )}

      {/* Social Templates */}
      {socialTemplates.length > 0 && affiliateInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t('affiliate.marketing.socialTemplates')}</h2>
          </div>
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
        </div>
      )}

      {/* Message Templates */}
      {messageTemplates.length > 0 && affiliateInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{t('affiliate.marketing.messageTemplates')}</h2>
          </div>
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
        </div>
      )}

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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            <CardTitle>{t('affiliate.marketing.bestPractices')}</CardTitle>
          </div>
          <CardDescription>{t('affiliate.marketing.tipsToMaximize')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">{t('affiliate.marketing.beAuthentic')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.beAuthenticDesc')}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">{t('affiliate.marketing.targetAudience')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.targetAudienceDesc')}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">{t('affiliate.marketing.useMultipleChannels')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.useMultipleChannelsDesc')}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">{t('affiliate.marketing.provideValue')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.provideValueDesc')}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">{t('affiliate.marketing.followUp')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.followUpDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>{t('affiliate.marketing.faq')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">{t('affiliate.marketing.faqQ1')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.faqA1')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">{t('affiliate.marketing.faqQ2')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.faqA2')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">{t('affiliate.marketing.faqQ3')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.faqA3')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">{t('affiliate.marketing.faqQ4')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('affiliate.marketing.faqA4')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Alert>
        <AlertDescription className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span>
            {t('affiliate.marketing.ctaMessage')}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}

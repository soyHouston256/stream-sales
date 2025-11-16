'use client';

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
        <h1 className="text-3xl font-bold">Marketing Materials</h1>
        <p className="text-muted-foreground mt-2">
          Tools and resources to promote your referral link
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
          <CardTitle>Conversion Statistics</CardTitle>
          <CardDescription>Track how your marketing efforts are performing</CardDescription>
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
                    <span className="text-sm">Link Views</span>
                  </div>
                  <div className="text-3xl font-bold">{stats.linkViews}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="text-sm">Registrations</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{stats.registrations}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Conversion Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{conversionRate}%</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conversion Progress</span>
                  <span className="font-medium">{stats.registrations} / {stats.linkViews}</span>
                </div>
                <Progress value={conversionRate} className="h-2" />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No statistics available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Templates */}
      {emailTemplates.length > 0 && affiliateInfo && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Email Templates</h2>
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
            <h2 className="text-xl font-semibold">Social Media Templates</h2>
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
            <h2 className="text-xl font-semibold">Direct Message Templates</h2>
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
            <CardTitle>Best Practices for Referrals</CardTitle>
          </div>
          <CardDescription>Tips to maximize your referral success</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Be Authentic</h4>
              <p className="text-sm text-muted-foreground">
                Share your genuine experience with Stream Sales. Personal stories resonate better than generic marketing copy.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Target the Right Audience</h4>
              <p className="text-sm text-muted-foreground">
                Focus on people who would genuinely benefit from digital products - content creators, educators, and entrepreneurs.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Use Multiple Channels</h4>
              <p className="text-sm text-muted-foreground">
                Share your referral link on social media, email, blogs, and direct messages. Different platforms reach different audiences.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Provide Value First</h4>
              <p className="text-sm text-muted-foreground">
                Don't just drop your link. Explain what Stream Sales offers and how it can help. Add a call-to-action that motivates sign-ups.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-semibold mb-2">Follow Up</h4>
              <p className="text-sm text-muted-foreground">
                Check in with people who showed interest. Answer questions and provide support to help them get started.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">How much commission do I earn per referral?</h4>
              <p className="text-sm text-muted-foreground">
                You earn commission on both registrations and sales made by your referrals. Check the Commissions page for specific rates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">When can I request a payment?</h4>
              <p className="text-sm text-muted-foreground">
                You can request payment once your available balance reaches $50 or more. Payments are typically processed within 5-7 business days.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Can I track individual referral performance?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! Go to the Referrals page to see detailed information about each person you've referred, including their activity and commissions generated.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Are there any restrictions on promotion?</h4>
              <p className="text-sm text-muted-foreground">
                Please promote ethically and honestly. Avoid spam, misleading claims, or paid advertising without disclosure. Quality over quantity!
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
            Start sharing your referral link today and earn commission on every successful referral!
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}

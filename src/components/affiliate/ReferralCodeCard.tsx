'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { copyReferralCode, copyReferralLink, shareReferralLink, isShareSupported } from '@/lib/utils/affiliate';
import { toast } from '@/lib/hooks';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReferralCodeCardProps {
  code: string;
  link: string;
}

export function ReferralCodeCard({ code, link }: ReferralCodeCardProps) {
  const { t } = useLanguage();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyCode = async () => {
    const success = await copyReferralCode(code);
    if (success) {
      setCodeCopied(true);
      toast({ title: t('affiliate.referralCard.copied'), description: t('affiliate.referralCard.codeCopied') });
      setTimeout(() => setCodeCopied(false), 2000);
    } else {
      toast({ title: t('affiliate.referralCard.error'), description: t('affiliate.referralCard.failedCopyCode'), variant: 'destructive' });
    }
  };

  const handleCopyLink = async () => {
    const success = await copyReferralLink(link);
    if (success) {
      setLinkCopied(true);
      toast({ title: t('affiliate.referralCard.copied'), description: t('affiliate.referralCard.linkCopied') });
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      toast({ title: t('affiliate.referralCard.error'), description: t('affiliate.referralCard.failedCopyLink'), variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const success = await shareReferralLink(code, link);
    if (!success) {
      // Fallback to copy if share failed or was cancelled
      handleCopyLink();
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl">{t('affiliate.referralCard.title')}</CardTitle>
        <CardDescription>{t('affiliate.referralCard.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">{t('affiliate.referralCard.code')}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-primary bg-background/50 p-4 text-center">
              <span className="text-3xl font-bold tracking-wider text-primary">{code}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="h-14 w-14 shrink-0"
            >
              {codeCopied ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">{t('affiliate.referralCard.link')}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border bg-background/50 p-3">
              <p className="truncate text-sm text-muted-foreground">{link}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              {isShareSupported() && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            {t('affiliate.referralCard.helpText')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

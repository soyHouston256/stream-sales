'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarketingTemplate } from '@/types/affiliate';
import { replaceTemplateVariables } from '@/lib/utils/affiliate';
import { toast } from '@/lib/hooks';

interface ReferralTextTemplateProps {
  template: MarketingTemplate;
  variables: {
    code: string;
    link: string;
    name: string;
  };
}

export function ReferralTextTemplate({ template, variables }: ReferralTextTemplateProps) {
  const [copied, setCopied] = useState(false);

  const filledContent = replaceTemplateVariables(template.content, variables);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filledContent);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Template copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy template', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{template.title}</CardTitle>
            <CardDescription className="capitalize">{template.category}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">{filledContent}</p>
        </div>
      </CardContent>
    </Card>
  );
}

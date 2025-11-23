import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * GET /api/affiliate/marketing/templates
 *
 * Get marketing templates for affiliates (banners, social media posts, email templates).
 * Requires authentication and affiliate role.
 *
 * Headers:
 * - Authorization: Bearer <token>
 *
 * Response 200:
 * {
 *   "templates": [
 *     {
 *       "id": "template_1",
 *       "type": "banner",
 *       "name": "Banner 728x90",
 *       "description": "Horizontal banner for websites",
 *       "imageUrl": "https://example.com/banners/728x90.png",
 *       "code": "<a href='{{referralLink}}'><img src='...' /></a>",
 *       "size": "728x90",
 *       "format": "png"
 *     },
 *     {
 *       "id": "template_2",
 *       "type": "social",
 *       "name": "Facebook Post",
 *       "description": "Ready-to-share Facebook post",
 *       "content": "Check out this amazing platform! Join using my link: {{referralLink}}",
 *       "platform": "facebook"
 *     },
 *     {
 *       "id": "template_3",
 *       "type": "email",
 *       "name": "Email Template",
 *       "description": "Professional email template",
 *       "subject": "Join the best marketplace platform",
 *       "body": "Hi,\n\nI wanted to share this amazing platform with you...\n\nSign up here: {{referralLink}}"
 *     }
 *   ]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Return marketing templates
    // In a real application, these would come from the database
    const templates = [
      // Banners
      {
        id: 'banner_728x90',
        type: 'banner',
        name: 'Leaderboard Banner (728x90)',
        description: 'Horizontal banner perfect for website headers',
        imageUrl: 'https://placehold.co/728x90/6366f1/ffffff?text=Stream+Sales+728x90',
        code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/728x90/6366f1/ffffff?text=Stream+Sales+728x90" alt="Stream Sales" /></a>`,
        size: '728x90',
        format: 'png',
        category: 'banner',
      },
      {
        id: 'banner_300x250',
        type: 'banner',
        name: 'Medium Rectangle (300x250)',
        description: 'Popular sidebar banner size',
        imageUrl: 'https://placehold.co/300x250/6366f1/ffffff?text=Stream+Sales',
        code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/300x250/6366f1/ffffff?text=Stream+Sales" alt="Stream Sales" /></a>`,
        size: '300x250',
        format: 'png',
        category: 'banner',
      },
      {
        id: 'banner_160x600',
        type: 'banner',
        name: 'Skyscraper (160x600)',
        description: 'Vertical banner for sidebars',
        imageUrl: 'https://placehold.co/160x600/6366f1/ffffff?text=Stream+Sales',
        code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/160x600/6366f1/ffffff?text=Stream+Sales" alt="Stream Sales" /></a>`,
        size: '160x600',
        format: 'png',
        category: 'banner',
      },

      // Social Media
      {
        id: 'social_facebook',
        type: 'social',
        name: 'Facebook Post',
        description: 'Ready-to-share Facebook post template',
        content: `🚀 I've been using Stream Sales and it's amazing!

Join the best digital marketplace platform for buying and selling digital products.

✅ Easy to use
✅ Secure transactions
✅ Great support

Sign up using my referral link: {{referralLink}}`,
        platform: 'facebook',
        category: 'social',
      },
      {
        id: 'social_twitter',
        type: 'social',
        name: 'Twitter/X Post',
        description: 'Short tweet template',
        content: `Check out @StreamSales - the best marketplace for digital products! 🚀

Join using my link: {{referralLink}}

#affiliate #digitalmarketing #marketplace`,
        platform: 'twitter',
        category: 'social',
      },
      {
        id: 'social_instagram',
        type: 'social',
        name: 'Instagram Caption',
        description: 'Instagram post caption',
        content: `🎯 Want to earn money online?

I've been using Stream Sales and earning commissions by referring others!

💰 Earn passive income
🎁 Get rewarded for referrals
🚀 Easy setup

Link in bio or DM me for details!

#affiliate #passiveincome #digitalmarketing #entrepreneur`,
        platform: 'instagram',
        category: 'social',
      },

      // Email Templates
      {
        id: 'email_introduction',
        type: 'email',
        name: 'Introduction Email',
        description: 'Professional introduction email',
        subject: 'Discover Stream Sales - Digital Marketplace',
        body: `Hi [Name],

I wanted to share something exciting with you!

I recently joined Stream Sales, a digital marketplace platform where you can buy and sell digital products with ease.

Here's why I think you'll love it:

✅ Wide variety of digital products
✅ Secure and fast transactions
✅ Earn money as an affiliate
✅ User-friendly platform

I've included my referral link below if you'd like to check it out:
{{referralLink}}

Feel free to reach out if you have any questions!

Best regards,
[Your Name]`,
        category: 'email',
      },
      {
        id: 'email_followup',
        type: 'email',
        name: 'Follow-up Email',
        description: 'Follow-up email template',
        subject: 'Still interested in Stream Sales?',
        body: `Hi [Name],

I wanted to follow up on my previous email about Stream Sales.

Have you had a chance to check it out? The platform has been great for me, and I think you'd really benefit from it too.

Here's my referral link again: {{referralLink}}

Let me know if you have any questions - I'm happy to help!

Best,
[Your Name]`,
        category: 'email',
      },

      // Text/Link
      {
        id: 'text_short',
        type: 'text',
        name: 'Short Text Link',
        description: 'Simple text with referral link',
        content: 'Join Stream Sales: {{referralLink}}',
        category: 'text',
      },
      {
        id: 'text_cta',
        type: 'text',
        name: 'Call-to-Action Text',
        description: 'Compelling CTA with link',
        content: '🚀 Start earning with Stream Sales today! Click here to join: {{referralLink}}',
        category: 'text',
      },
    ];

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching marketing templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

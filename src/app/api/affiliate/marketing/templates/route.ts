import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/infrastructure/auth/jwt';

export const dynamic = 'force-dynamic';

// Templates in English
const templatesEN = {
  social: [
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
  ],
  email: [
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
  ],
  banner: [
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
  ],
  text: [
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
  ],
};

// Templates in Spanish
const templatesES = {
  social: [
    {
      id: 'social_facebook',
      type: 'social',
      name: 'Publicación de Facebook',
      description: 'Plantilla lista para compartir en Facebook',
      content: `🚀 ¡He estado usando Stream Sales y es increíble!

Únete a la mejor plataforma de marketplace digital para comprar y vender productos digitales.

✅ Fácil de usar
✅ Transacciones seguras
✅ Excelente soporte

Regístrate usando mi enlace de referido: {{referralLink}}`,
      platform: 'facebook',
      category: 'social',
    },
    {
      id: 'social_twitter',
      type: 'social',
      name: 'Post de Twitter/X',
      description: 'Plantilla de tweet corto',
      content: `¡Conoce @StreamSales - el mejor marketplace de productos digitales! 🚀

Únete con mi enlace: {{referralLink}}

#afiliado #marketingdigital #marketplace`,
      platform: 'twitter',
      category: 'social',
    },
    {
      id: 'social_instagram',
      type: 'social',
      name: 'Descripción de Instagram',
      description: 'Descripción para publicación de Instagram',
      content: `🎯 ¿Quieres ganar dinero en línea?

¡He estado usando Stream Sales y ganando comisiones refiriendo a otros!

💰 Gana ingresos pasivos
🎁 Recibe recompensas por referidos
🚀 Fácil configuración

¡Enlace en mi bio o escríbeme por DM para más detalles!

#afiliado #ingresospasivos #marketingdigital #emprendedor`,
      platform: 'instagram',
      category: 'social',
    },
  ],
  email: [
    {
      id: 'email_introduction',
      type: 'email',
      name: 'Email de Introducción',
      description: 'Email profesional de introducción',
      subject: 'Descubre Stream Sales - Marketplace Digital',
      body: `Hola [Nombre],

¡Quería compartir algo emocionante contigo!

Recientemente me uní a Stream Sales, una plataforma de marketplace digital donde puedes comprar y vender productos digitales fácilmente.

Por qué creo que te encantará:

✅ Gran variedad de productos digitales
✅ Transacciones seguras y rápidas
✅ Gana dinero como afiliado
✅ Plataforma fácil de usar

Incluí mi enlace de referido abajo si quieres echarle un vistazo:
{{referralLink}}

¡No dudes en escribirme si tienes alguna pregunta!

Saludos,
[Tu Nombre]`,
      category: 'email',
    },
    {
      id: 'email_followup',
      type: 'email',
      name: 'Email de Seguimiento',
      description: 'Plantilla de email de seguimiento',
      subject: '¿Aún interesado en Stream Sales?',
      body: `Hola [Nombre],

Quería dar seguimiento a mi email anterior sobre Stream Sales.

¿Has tenido oportunidad de revisarlo? La plataforma ha sido genial para mí, y creo que tú también te beneficiarías.

Aquí está mi enlace de referido de nuevo: {{referralLink}}

¡Avísame si tienes alguna pregunta - estaré encantado de ayudar!

Saludos,
[Tu Nombre]`,
      category: 'email',
    },
  ],
  banner: [
    {
      id: 'banner_728x90',
      type: 'banner',
      name: 'Banner Leaderboard (728x90)',
      description: 'Banner horizontal perfecto para cabeceras de sitios web',
      imageUrl: 'https://placehold.co/728x90/6366f1/ffffff?text=Stream+Sales+728x90',
      code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/728x90/6366f1/ffffff?text=Stream+Sales+728x90" alt="Stream Sales" /></a>`,
      size: '728x90',
      format: 'png',
      category: 'banner',
    },
    {
      id: 'banner_300x250',
      type: 'banner',
      name: 'Rectángulo Mediano (300x250)',
      description: 'Tamaño popular para barras laterales',
      imageUrl: 'https://placehold.co/300x250/6366f1/ffffff?text=Stream+Sales',
      code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/300x250/6366f1/ffffff?text=Stream+Sales" alt="Stream Sales" /></a>`,
      size: '300x250',
      format: 'png',
      category: 'banner',
    },
    {
      id: 'banner_160x600',
      type: 'banner',
      name: 'Rascacielos (160x600)',
      description: 'Banner vertical para barras laterales',
      imageUrl: 'https://placehold.co/160x600/6366f1/ffffff?text=Stream+Sales',
      code: `<a href="{{referralLink}}" target="_blank"><img src="https://placehold.co/160x600/6366f1/ffffff?text=Stream+Sales" alt="Stream Sales" /></a>`,
      size: '160x600',
      format: 'png',
      category: 'banner',
    },
  ],
  text: [
    {
      id: 'text_short',
      type: 'text',
      name: 'Texto Corto con Enlace',
      description: 'Texto simple con enlace de referido',
      content: 'Únete a Stream Sales: {{referralLink}}',
      category: 'text',
    },
    {
      id: 'text_cta',
      type: 'text',
      name: 'Texto con Llamada a la Acción',
      description: 'CTA convincente con enlace',
      content: '🚀 ¡Empieza a ganar con Stream Sales hoy! Haz clic aquí para unirte: {{referralLink}}',
      category: 'text',
    },
  ],
};

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

    // 2. Get language from query params (default to 'es')
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'es';

    // 3. Select templates based on language
    const templateData = lang === 'es' ? templatesES : templatesEN;

    // 4. Flatten templates into a single array
    const templates = [
      ...templateData.banner,
      ...templateData.social,
      ...templateData.email,
      ...templateData.text,
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

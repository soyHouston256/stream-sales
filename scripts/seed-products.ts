import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
    'streaming',
    'license',
    'course',
    'ebook',
    'ai',
    'netflix',
    'spotify',
    'hbo',
    'disney',
    'prime',
    'youtube',
    'other',
] as const;

const REALISTIC_NAMES: Record<string, string[]> = {
    netflix: [
        'Netflix Premium 4K UHD - 1 Profile',
        'Netflix Standard HD - 1 Profile',
        'Netflix Premium Family Plan',
        'Netflix Private Account - 4K',
        'Netflix Shared Account - HD',
        'Netflix 1 Month Subscription',
        'Netflix 3 Months Bundle',
        'Netflix 6 Months Saver',
        'Netflix Annual Pass',
        'Netflix Kids Profile',
    ],
    spotify: [
        'Spotify Premium Individual',
        'Spotify Duo Plan',
        'Spotify Family Premium',
        'Spotify Student Discount',
        'Spotify 3 Months Premium',
        'Spotify 6 Months Premium',
        'Spotify 1 Year Premium',
        'Spotify Artist Account',
        'Spotify Podcaster Pro',
        'Spotify HiFi Access',
    ],
    hbo: [
        'HBO Max Ad-Free Plan',
        'HBO Max Standard',
        'HBO Max 1 Month Access',
        'HBO Max 3 Months Bundle',
        'HBO Max Annual Subscription',
        'HBO Max 4K UHD Profile',
        'HBO Max Mobile Only',
        'HBO Max Global Access',
        'HBO Max + Discovery Bundle',
        'HBO Max Exclusive Series Pass',
    ],
    disney: [
        'Disney+ Premium Access',
        'Disney+ Standard Plan',
        'Disney+ Bundle (Hulu/ESPN)',
        'Disney+ 1 Month Subscription',
        'Disney+ 3 Months Saver',
        'Disney+ Annual Pass',
        'Disney+ IMAX Enhanced',
        'Disney+ Kids Profile',
        'Disney+ GroupWatch Access',
        'Disney+ Premier Access',
    ],
    prime: [
        'Prime Video Full Access',
        'Prime Video 1 Month',
        'Prime Video 6 Months',
        'Prime Video Annual',
        'Prime Video 4K UHD',
        'Prime Video + Music Bundle',
        'Prime Video Student',
        'Prime Video International',
        'Prime Video Exclusive',
        'Prime Video Ad-Free',
    ],
    youtube: [
        'YouTube Premium Individual',
        'YouTube Premium Family',
        'YouTube Music Premium',
        'YouTube Premium 1 Month',
        'YouTube Premium 3 Months',
        'YouTube Premium 6 Months',
        'YouTube Premium Annual',
        'YouTube TV Basic',
        'YouTube TV Sports Add-on',
        'YouTube Kids Ad-Free',
    ],
    streaming: [
        'Paramount+ Premium',
        'Peacock Premium Plus',
        'Apple TV+ Subscription',
        'Hulu No Ads Plan',
        'Crunchyroll Mega Fan',
        'Funimation Premium',
        'Sling TV Blue',
        'FuboTV Pro',
        'ESPN+ Monthly',
        'Discovery+ Ad-Free',
    ],
    license: [
        'Windows 11 Pro Key',
        'Windows 10 Home Key',
        'Office 2021 Professional Plus',
        'Office 365 Personal 1 Year',
        'Adobe Creative Cloud All Apps',
        'Adobe Photoshop 2024 License',
        'NordVPN 1 Year Subscription',
        'ExpressVPN 6 Months Key',
        'Kaspersky Total Security',
        'McAfee Antivirus 1 Year',
    ],
    course: [
        'Full Stack Web Development Bootcamp',
        'Python for Data Science Masterclass',
        'Digital Marketing Strategy 2024',
        'Graphic Design Master Course',
        'React Native Mobile App Dev',
        'AWS Certified Solutions Architect',
        'Excel from Beginner to Advanced',
        'SEO Training Course by Moz',
        'Machine Learning A-Z',
        'Ethical Hacking for Beginners',
    ],
    ebook: [
        'The Psychology of Money',
        'Atomic Habits - Digital Edition',
        'Rich Dad Poor Dad PDF',
        'Clean Code: Agile Software Craftsmanship',
        'The Pragmatic Programmer',
        'Deep Work: Rules for Focused Success',
        'Zero to One: Notes on Startups',
        'The Lean Startup',
        'Sapiens: A Brief History of Humankind',
        'Thinking, Fast and Slow',
    ],
    ai: [
        'ChatGPT Plus Shared Account',
        'MidJourney Pro Subscription',
        'Jasper AI Boss Mode',
        'Copy.ai Pro Plan',
        'Notion AI Add-on',
        'GitHub Copilot Individual',
        'Canva Pro Lifetime',
        'Grammarly Premium 1 Year',
        'Otter.ai Business',
        'Synthesia Personal Plan',
    ],
    other: [
        'PlayStation Plus Deluxe 1 Year',
        'Xbox Game Pass Ultimate 1 Month',
        'Nintendo Switch Online Family',
        'Steam Wallet Code $50',
        'Roblox Robux 800',
        'Fortnite V-Bucks 1000',
        'Minecraft Java & Bedrock',
        'Discord Nitro 1 Month',
        'Twitch Turbo Subscription',
        'Zoom Pro License',
    ],
};

async function main() {
    console.log('🌱 Seeding mock products...');

    // 1. Find or create a provider
    let provider = await prisma.user.findFirst({
        where: { role: 'provider' },
    });

    if (!provider) {
        console.log('⚠️ No provider found. Creating mock provider...');
        const hashedPassword = await hash('password123', 10);
        provider = await prisma.user.create({
            data: {
                email: 'mock-provider@example.com',
                password: hashedPassword,
                name: 'Mock Provider',
                role: 'provider',
                wallet: {
                    create: {
                        balance: 0,
                        currency: 'USD',
                    },
                },
            },
        });
        console.log(`✅ Created provider: ${provider.email}`);
    } else {
        console.log(`ℹ️ Using existing provider: ${provider.email}`);
    }

    // 2. Create products for each category
    for (const category of CATEGORIES) {
        console.log(`📦 Seeding 10 products for category: ${category}...`);

        for (let i = 1; i <= 10; i++) {
            const names = REALISTIC_NAMES[category] || REALISTIC_NAMES['other'];
            // Use modulo to cycle through names if i > length, or random
            const productName = names[(i - 1) % names.length];
            const price = (Math.random() * 50 + 5).toFixed(2); // Random price between 5 and 55

            // Create Product
            const product = await prisma.product.create({
                data: {
                    providerId: provider.id,
                    name: productName,
                    description: `Experience the best of ${category} with ${productName}. Instant delivery, 24/7 support, and full warranty included. Perfect for personal use or sharing with family.`,
                    category: category,
                    imageUrl: `https://placehold.co/600x400?text=${category}+${i}`,
                    isActive: true,
                    variants: {
                        create: {
                            name: 'Standard Access',
                            price: parseFloat(price),
                            durationDays: 30,
                            isRenewable: true,
                        },
                    },
                },
            });

            // Create Inventory based on category
            if (['streaming', 'ai', 'netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube'].includes(category)) {
                // Create Inventory Account
                await prisma.inventoryAccount.create({
                    data: {
                        productId: product.id,
                        email: `account${i}@${category}.com`,
                        passwordHash: 'encrypted_password',
                        platformType: category,
                        totalSlots: 5,
                        availableSlots: 5,
                        slots: {
                            createMany: {
                                data: [
                                    { profileName: 'Profile 1', pinCode: '1111' },
                                    { profileName: 'Profile 2', pinCode: '2222' },
                                    { profileName: 'Profile 3', pinCode: '3333' },
                                    { profileName: 'Profile 4', pinCode: '4444' },
                                    { profileName: 'Profile 5', pinCode: '5555' },
                                ],
                            },
                        },
                    },
                });
            } else if (category === 'license') {
                // Create Inventory License
                await prisma.inventoryLicense.createMany({
                    data: [
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-001`, activationType: 'serial' },
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-002`, activationType: 'serial' },
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-003`, activationType: 'serial' },
                    ],
                });
            } else if (['course', 'ebook', 'other'].includes(category)) {
                // Create Digital Content
                await prisma.digitalContent.create({
                    data: {
                        productId: product.id,
                        contentType: category === 'ebook' ? 'ebook_drive' : 'recorded_iframe',
                        resourceUrl: 'https://example.com/resource',
                        coverImageUrl: `https://placehold.co/400x600?text=Cover+${i}`,
                    },
                });
            }
        }
    }

    console.log('✅ Seeding completed successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });

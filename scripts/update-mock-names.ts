import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    console.log('🔄 Updating product names to be more realistic...');

    const products = await prisma.product.findMany();
    let updatedCount = 0;

    for (const product of products) {
        const category = product.category;
        const names = REALISTIC_NAMES[category] || REALISTIC_NAMES['other'];

        // Pick a random name from the list, or use a deterministic one based on ID/Index if we wanted
        // For now, let's just pick one randomly to mix it up, or cycle through them.
        // To ensure variety if we have many products, let's use a random one.
        const newName = names[Math.floor(Math.random() * names.length)];

        // Generate a realistic description
        const newDescription = `Experience the best of ${category} with ${newName}. Instant delivery, 24/7 support, and full warranty included. Perfect for personal use or sharing with family.`;

        await prisma.product.update({
            where: { id: product.id },
            data: {
                name: newName,
                description: newDescription,
            },
        });

        updatedCount++;
        process.stdout.write(`\rUpdated ${updatedCount}/${products.length} products...`);
    }

    console.log('\n✅ Successfully updated all product names!');
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

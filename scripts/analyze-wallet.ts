
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Get all users with a wallet
    const users = await prisma.user.findMany({
        include: {
            wallet: true,
        },
    });

    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        if (!user.wallet) continue;

        // 2. Get all transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { sourceWalletId: user.wallet.id },
                    { destinationWalletId: user.wallet.id },
                ],
            },
            orderBy: { createdAt: 'asc' },
        });

        let calculatedBalance = 0;
        let totalRecharges = 0;
        let totalPurchases = 0;
        let totalFees = 0;
        let otherCredits = 0;
        let otherDebits = 0;

        for (const tx of transactions) {
            const amount = Number(tx.amount);
            // let type = ''; // No longer needed for this simplified output

            if (tx.destinationWalletId === user.wallet.id) {
                // Credit
                calculatedBalance += amount;
                // type = 'CREDIT'; // No longer needed

                if (tx.relatedEntityType === 'Recharge') {
                    totalRecharges += amount;
                } else {
                    otherCredits += amount;
                }
            } else if (tx.sourceWalletId === user.wallet.id) {
                // Debit
                calculatedBalance -= amount;
                // type = 'DEBIT'; // No longer needed

                if (tx.relatedEntityType === 'Purchase' || tx.relatedEntityType === 'Order') {
                    totalPurchases += amount;
                } else if (tx.description.toLowerCase().includes('fee') || tx.relatedEntityType === 'Fee') {
                    totalFees += amount;
                } else {
                    otherDebits += amount;
                }
            }
        }

        const diff = Number(user.wallet.balance) - calculatedBalance;

        // Only print details if there are non-purchase debits or a discrepancy
        if (totalFees > 0 || otherDebits > 0 || Math.abs(diff) > 0.01) {
            console.log(`\nAnalyzing User: ${user.email} (${user.id})`);
            console.log(`Current Wallet Balance: ${user.wallet.balance}`);

            for (const tx of transactions) {
                const amount = Number(tx.amount);
                if (tx.sourceWalletId === user.wallet.id && tx.relatedEntityType !== 'Purchase' && tx.relatedEntityType !== 'Order') {
                    console.log(`[${tx.createdAt.toISOString()}] DEBIT $${amount.toFixed(2)} - ${tx.description} (Type: ${tx.type}, Entity: ${tx.relatedEntityType})`);
                }
            }

            console.log('--- Summary ---');
            console.log(`Total Recharges: $${totalRecharges.toFixed(2)}`);
            console.log(`Total Purchases: $${totalPurchases.toFixed(2)}`);
            console.log(`Total Fees: $${totalFees.toFixed(2)}`);
            console.log(`Other Debits: $${otherDebits.toFixed(2)}`);
            console.log(`Calculated Balance: $${calculatedBalance.toFixed(2)}`);
            console.log(`Actual Balance: $${Number(user.wallet.balance).toFixed(2)}`);

            if (Math.abs(diff) > 0.01) {
                console.log(`⚠️  DISCREPANCY DETECTED: $${diff.toFixed(2)}`);
            }
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/database/prisma';
import { JwtService } from '@/infrastructure/auth/JwtService';

export const dynamic = 'force-dynamic';

const jwtService = new JwtService();

export async function GET(request: NextRequest) {
    try {
        // 1. Verify Authentication & Authorization (Admin only)
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwtService.verify(token);

        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch Provider Profiles
        const providerProfiles = await prisma.providerProfile.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ data: providerProfiles });
    } catch (error) {
        console.error('Error fetching provider profiles:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

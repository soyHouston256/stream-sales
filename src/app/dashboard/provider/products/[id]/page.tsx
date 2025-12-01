'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProduct } from '@/lib/hooks/useProducts';
import { ProductEditor } from '@/components/provider/products/ProductEditor';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useLanguage();
    const id = params.id as string;

    const { data: product, isLoading, error } = useProduct(id);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 size={40} className="text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">{t('common.loading')}</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{t('common.error')}</h2>
                <p className="text-slate-500 mb-6 max-w-md">
                    {t('provider.products.notFound')}
                </p>
                <Button onClick={() => router.push('/dashboard/provider/products')} variant="outline">
                    {t('common.back')}
                </Button>
            </div>
        );
    }

    return <ProductEditor initialData={product} />;
}

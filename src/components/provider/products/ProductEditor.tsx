'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { useUpdateProduct } from '@/lib/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { StepBasicInfo } from './wizard/StepBasicInfo';
import { StepInventory } from './wizard/StepInventory';
import { WizardFormData } from './wizard/ProductCreatorWizard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductEditorProps {
    initialData: any; // We'll map this to WizardFormData
}

export function ProductEditor({ initialData }: ProductEditorProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();
    const updateProduct = useUpdateProduct();

    // Map API data to form data
    const mapInitialDataToForm = (data: any): WizardFormData => {
        return {
            name: data.name || '',
            description: data.description || '',
            price: data.price || '',
            durationDays: data.durationDays || 0,
            imageUrl: data.imageUrl || '',
            category: data.category,

            // Variants - assuming single variant for now based on current wizard
            variants: [],

            // Inventory mapping
            platformType: data.accountDetails?.platformType || 'netflix',
            accountType: data.accountDetails?.accountType || 'profile',
            email: data.accountEmail || '',
            password: '', // Don't pre-fill password for security, or handle if needed
            profiles: data.accountDetails?.profiles || [{ name: `${t('provider.wizard.form.defaultProfileName')} 1`, pin: '' }],

            licenseType: data.accountDetails?.licenseType || 'serial',
            licenseKeys: '', // Don't pre-fill keys usually? Or maybe we should?

            contentType: data.accountDetails?.contentType || 'live_meet',
            resourceUrl: data.accountDetails?.resourceUrl || '',
            liveDate: data.accountDetails?.liveDate || '',
            coverImageUrl: data.accountDetails?.coverImageUrl || '',
        };
    };

    const [formData, setFormData] = useState<WizardFormData>(mapInitialDataToForm(initialData));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateFormData = (updates: Partial<WizardFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        try {
            setIsSubmitting(true);

            await updateProduct.mutateAsync({
                id: initialData.id,
                data: {
                    name: formData.name,
                    description: formData.description,
                    price: formData.price ? parseFloat(formData.price) : undefined,
                    durationDays: formData.durationDays,
                    imageUrl: formData.imageUrl || undefined,
                    accountEmail: formData.email || undefined,
                    accountPassword: formData.password || undefined, // Only send if changed
                    accountDetails: {
                        platformType: formData.platformType,
                        accountType: formData.accountType,
                        profiles: formData.profiles,
                        licenseType: formData.licenseType,
                        contentType: formData.contentType,
                        resourceUrl: formData.resourceUrl,
                        liveDate: formData.liveDate,
                        coverImageUrl: formData.coverImageUrl,
                    },
                },
            });

            toast({
                title: t('common.success'),
                description: t('provider.products.updateSuccess'),
                variant: 'default',
            });

            router.push('/dashboard/provider/products');
        } catch (error) {
            console.error('Error updating product:', error);
            toast({
                title: t('common.error'),
                description: t('provider.products.updateError'),
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft size={20} className="text-slate-500 dark:text-slate-400" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('provider.products.editProduct')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{formData.name}</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="gap-2"
                >
                    {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {t('common.saveChanges')}
                </Button>
            </div>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl mb-6">
                    <TabsTrigger value="basic" className="rounded-lg data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400">
                        {t('provider.wizard.step2Title')}
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 dark:text-slate-400">
                        {t('provider.wizard.step3Title')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-0">
                    <StepBasicInfo data={formData} onChange={updateFormData} />
                </TabsContent>

                <TabsContent value="inventory" className="mt-0">
                    <StepInventory data={formData} onChange={updateFormData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

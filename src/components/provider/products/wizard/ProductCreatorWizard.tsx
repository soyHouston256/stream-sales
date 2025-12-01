'use client';

import { useCreateProduct } from '@/lib/hooks/useProducts';
import { useToast } from '@/lib/hooks/useToast';

import { useState } from 'react';
import { X, Save, Package, Settings, Key, Video, BookOpen, Tv, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepCategory } from './StepCategory';
import { StepBasicInfo } from './StepBasicInfo';
import { StepInventory } from './StepInventory';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductCategory } from '@/types/provider';

interface ProductCreatorWizardProps {
    onClose: () => void;
}

export type WizardFormData = {
    // Basic Info
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    category: ProductCategory | null;

    // Variants (Simplified for now, maybe just one variant or multiple)
    variants: {
        name: string;
        price: string;
        durationDays: number | null;
        isRenewable: boolean;
    }[];

    // Inventory - Streaming/AI
    platformType: string;
    accountType: 'profile' | 'full';
    email: string;
    password: string;
    profiles: { name: string; pin: string }[];

    // Inventory - License
    licenseType: 'serial' | 'email_invite';
    licenseKeys: string; // Newline separated

    // Inventory - Education/Ebook
    contentType: 'live_meet' | 'recorded_iframe' | 'ebook_drive';
    resourceUrl: string;
    liveDate: string;
    coverImageUrl: string;
};

const INITIAL_DATA: WizardFormData = {
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: null,
    variants: [],
    platformType: 'netflix',
    accountType: 'profile',
    email: '',
    password: '',
    profiles: [{ name: 'Perfil 1', pin: '' }],
    licenseType: 'serial',
    licenseKeys: '',
    contentType: 'live_meet',
    resourceUrl: '',
    liveDate: '',
    coverImageUrl: '',
};

export function ProductCreatorWizard({ onClose }: ProductCreatorWizardProps) {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<WizardFormData>(INITIAL_DATA);
    const createProduct = useCreateProduct();
    const { toast } = useToast();

    const updateFormData = (updates: Partial<WizardFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        if (!formData.category) {
            toast({ title: 'Error', description: 'Category is required', variant: 'destructive' });
            return;
        }

        try {
            await createProduct.mutateAsync({
                ...formData,
                category: formData.category,
                // Ensure optional fields are handled or passed as undefined if empty strings
                price: formData.price,
                profiles: formData.profiles.map(p => ({ name: p.name, pin: p.pin || undefined })),
            });
            onClose();
        } catch (error) {
            console.error('Error saving product:', error);
            // Error is handled by the hook's onError usually, but we catch here to stop flow if needed
        }
    };

    const isSubmitting = createProduct.isPending;

    const getStepTitle = () => {
        switch (step) {
            case 1: return t('provider.wizard.step1Title');
            case 2: return t('provider.wizard.step2Title');
            case 3: return t('provider.wizard.step3Title');
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{t('provider.wizard.newProduct')}</h2>
                        <p className="text-sm text-slate-400">
                            {t('provider.wizard.step')} {step} {t('provider.wizard.of')} 3 • {formData.category ? t(`provider.wizard.categories.${formData.category}`) : t('provider.wizard.categorySelection')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    {step === 1 && (
                        <StepCategory
                            selectedCategory={formData.category}
                            onSelect={(category) => {
                                updateFormData({ category });
                                setStep(2);
                            }}
                        />
                    )}

                    {step === 2 && (
                        <StepBasicInfo
                            data={formData}
                            onChange={updateFormData}
                        />
                    )}

                    {step === 3 && (
                        <StepInventory
                            data={formData}
                            onChange={updateFormData}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-white flex justify-between z-10">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="text-slate-500 font-bold hover:text-slate-800 transition-colors"
                        >
                            {t('common.back')}
                        </button>
                    )}

                    <div className="ml-auto flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>

                        {step < 3 && step > 1 && (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
                            >
                                {t('common.continue')}
                            </button>
                        )}

                        {step === 3 && (
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 flex items-center gap-2 h-auto"
                            >
                                <Save size={18} />
                                {isSubmitting ? t('common.saving') : t('common.saveProduct')}
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

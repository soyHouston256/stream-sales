'use client';
import { Package } from 'lucide-react';
import { WizardFormData } from './ProductCreatorWizard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/shared/ImageUpload';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StepBasicInfoProps {
    data: WizardFormData;
    onChange: (updates: Partial<WizardFormData>) => void;
}

export function StepBasicInfo({ data, onChange }: StepBasicInfoProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                <Package size={20} className="text-indigo-500" />
                {t('provider.wizard.step2Title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {t('provider.wizard.form.name')}
                    </Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder={t('provider.wizard.form.namePlaceholder')}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
                    />
                </div>

                <div className="col-span-2">
                    <Label htmlFor="description" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {t('provider.wizard.form.description')}
                    </Label>
                    <Textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                        placeholder={t('provider.wizard.form.descPlaceholder')}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500 min-h-[100px]"
                    />
                </div>

                <div>
                    <Label htmlFor="price" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {t('provider.wizard.form.price')}
                    </Label>
                    <Input
                        id="price"
                        type="number"
                        value={data.price}
                        onChange={(e) => onChange({ price: e.target.value })}
                        placeholder={t('provider.wizard.form.pricePlaceholder')}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <Label htmlFor="duration" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {t('provider.wizard.form.duration')}
                    </Label>
                    <Select
                        value={data.durationDays?.toString() || "0"}
                        onValueChange={(value) => onChange({ durationDays: parseInt(value) })}
                    >
                        <SelectTrigger id="duration" className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500">
                            <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{t('provider.products.durations.lifetime')}</SelectItem>
                            <SelectItem value="30">{t('provider.products.durations.1month')}</SelectItem>
                            <SelectItem value="90">{t('provider.products.durations.3months')}</SelectItem>
                            <SelectItem value="180">{t('provider.products.durations.6months')}</SelectItem>
                            <SelectItem value="365">{t('provider.products.durations.1year')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {t('provider.wizard.form.imageUrl')}
                    </Label>

                    <ImageUpload
                        value={data.imageUrl}
                        onChange={(value) => onChange({ imageUrl: value })}
                    />
                </div>
            </div>
        </div>
    );
}

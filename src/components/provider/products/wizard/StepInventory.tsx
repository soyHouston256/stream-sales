'use client';

import { Settings, Key, Video, BookOpen, Plus, Trash2, Calendar, Monitor, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { WizardFormData } from './ProductCreatorWizard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface StepInventoryProps {
    data: WizardFormData;
    onChange: (updates: Partial<WizardFormData>) => void;
}

export function StepInventory({ data, onChange }: StepInventoryProps) {
    const { t } = useLanguage();

    const addProfile = () => {
        onChange({
            profiles: [...data.profiles, { name: `${t('provider.wizard.form.defaultProfileName')} ${data.profiles.length + 1}`, pin: '' }]
        });
    };

    const removeProfile = (index: number) => {
        const newProfiles = [...data.profiles];
        newProfiles.splice(index, 1);
        onChange({ profiles: newProfiles });
    };

    const updateProfile = (index: number, field: 'name' | 'pin', value: string) => {
        const newProfiles = [...data.profiles];
        newProfiles[index][field] = value;
        onChange({ profiles: newProfiles });
    };

    // --- STREAMING & AI FORM ---
    const streamingCategories = ['streaming', 'ai', 'netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube'];
    if (data.category && streamingCategories.includes(data.category)) {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-red-500" />
                    {t('provider.wizard.form.accountConfig')}
                </h3>

                {/* Toggle Account Type */}
                <div className="flex gap-4 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                    <button
                        onClick={() => onChange({ accountType: 'profile' })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${data.accountType === 'profile' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                        {t('provider.wizard.form.byProfile')}
                    </button>
                    <button
                        onClick={() => onChange({ accountType: 'full' })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${data.accountType === 'full' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
                    >
                        {t('provider.wizard.form.fullAccount')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            {t('provider.wizard.form.masterEmail')}
                        </Label>
                        <Input
                            type="email"
                            value={data.email}
                            onChange={(e) => onChange({ email: e.target.value })}
                            placeholder={t('provider.wizard.form.emailPlaceholder')}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            {t('provider.wizard.form.password')}
                        </Label>
                        <Input
                            type="text"
                            value={data.password}
                            onChange={(e) => onChange({ password: e.target.value })}
                            placeholder={t('provider.wizard.form.passwordPlaceholder')}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        />
                    </div>
                </div>

                {/* Profile Manager */}
                {data.accountType === 'profile' && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                {t('provider.wizard.form.manageProfiles')}
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={addProfile}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-8 px-2"
                            >
                                <Plus size={14} className="mr-1" /> +1 {t('provider.wizard.form.profile')}
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {data.profiles.map((profile, idx) => (
                                <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-2 duration-300">
                                    <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                                        {idx + 1}
                                    </span>
                                    <Input
                                        value={profile.name}
                                        onChange={(e) => updateProfile(idx, 'name', e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        placeholder={t('provider.wizard.form.profileNamePlaceholder')}
                                    />
                                    <Input
                                        value={profile.pin}
                                        onChange={(e) => updateProfile(idx, 'pin', e.target.value)}
                                        className="w-24 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        placeholder={t('provider.wizard.form.pinPlaceholder')}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeProfile(idx)}
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- LICENSE FORM ---
    if (data.category === 'license') {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Key size={20} className="text-blue-500" />
                    {t('provider.wizard.form.licenseDetails')}
                </h3>

                <div className="flex gap-4 mb-6">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                            type="radio"
                            checked={data.licenseType === 'serial'}
                            onChange={() => onChange({ licenseType: 'serial' })}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('provider.wizard.form.serial')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                            type="radio"
                            checked={data.licenseType === 'email_invite'}
                            onChange={() => onChange({ licenseType: 'email_invite' })}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('provider.wizard.form.emailActivation')}</span>
                    </label>
                </div>

                {data.licenseType === 'serial' && (
                    <div>
                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
                            {t('provider.wizard.form.bulkKeys')}
                        </Label>
                        <Textarea
                            value={data.licenseKeys}
                            onChange={(e) => onChange({ licenseKeys: e.target.value })}
                            placeholder={t('provider.wizard.form.keysPlaceholder')}
                            rows={8}
                            className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            {t('provider.wizard.form.stockDetection')}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // --- EDUCATION FORM ---
    if (data.category === 'course') {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Video size={20} className="text-purple-500" />
                    {t('provider.wizard.form.courseFormat')}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => onChange({ contentType: 'live_meet' })}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${data.contentType === 'live_meet' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800'}`}
                    >
                        <Calendar className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={24} />
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{t('provider.wizard.form.liveMeet')}</div>
                    </button>
                    <button
                        onClick={() => onChange({ contentType: 'recorded_iframe' })}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${data.contentType === 'recorded_iframe' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800'}`}
                    >
                        <Monitor className="mx-auto mb-2 text-purple-600 dark:text-purple-400" size={24} />
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{t('provider.wizard.form.recorded')}</div>
                    </button>
                </div>

                {data.contentType === 'live_meet' ? (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {t('provider.wizard.form.dateTime')}
                            </Label>
                            <Input
                                type="datetime-local"
                                value={data.liveDate}
                                onChange={(e) => onChange({ liveDate: e.target.value })}
                                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {t('provider.wizard.form.meetingLink')}
                            </Label>
                            <Input
                                type="url"
                                value={data.resourceUrl}
                                onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                placeholder={t('provider.wizard.form.meetPlaceholder')}
                                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {t('provider.wizard.form.iframeCode')}
                            </Label>
                            <Textarea
                                value={data.resourceUrl}
                                onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                placeholder={t('provider.wizard.form.iframePlaceholder')}
                                rows={4}
                                className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono text-xs"
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- EBOOK FORM ---
    if (data.category === 'ebook') {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-orange-500" />
                    {t('provider.wizard.form.digitalResources')}
                </h3>

                <div className="flex gap-6">
                    <div className="w-32 h-44 bg-slate-100 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-300 transition-colors">
                        <ImageIcon size={24} className="mb-2" />
                        <span className="text-xs font-bold text-center">{t('provider.wizard.form.cover')}</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {t('provider.wizard.form.downloadLink')}
                            </Label>
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                                <LinkIcon size={18} className="text-slate-400 ml-2" />
                                <Input
                                    type="url"
                                    value={data.resourceUrl}
                                    onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                    className="bg-transparent border-none shadow-none focus-visible:ring-0"
                                    placeholder={t('provider.wizard.form.urlPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

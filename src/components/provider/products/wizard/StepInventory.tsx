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
            profiles: [...data.profiles, { name: `Perfil ${data.profiles.length + 1}`, pin: '' }]
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
    if (data.category === 'streaming' || data.category === 'ai') {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-red-500" />
                    {t('provider.wizard.accountConfig')}
                </h3>

                {/* Toggle Account Type */}
                <div className="flex gap-4 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                        onClick={() => onChange({ accountType: 'profile' })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${data.accountType === 'profile' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                    >
                        {t('provider.wizard.byProfile')}
                    </button>
                    <button
                        onClick={() => onChange({ accountType: 'full' })}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${data.accountType === 'full' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                    >
                        {t('provider.wizard.fullAccount')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                            {t('provider.wizard.masterEmail')}
                        </Label>
                        <Input
                            type="email"
                            value={data.email}
                            onChange={(e) => onChange({ email: e.target.value })}
                            placeholder="admin@netflix.com"
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                            {t('provider.wizard.password')}
                        </Label>
                        <Input
                            type="text"
                            value={data.password}
                            onChange={(e) => onChange({ password: e.target.value })}
                            placeholder="******"
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>

                {/* Profile Manager */}
                {data.accountType === 'profile' && (
                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <Label className="text-xs font-bold text-slate-500 uppercase">
                                {t('provider.wizard.manageProfiles')}
                            </Label>
                            <button
                                onClick={addProfile}
                                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                            >
                                <Plus size={14} /> +1 {t('provider.wizard.profile')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {data.profiles.map((profile, idx) => (
                                <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-2 duration-300">
                                    <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                        {idx + 1}
                                    </span>
                                    <Input
                                        value={profile.name}
                                        onChange={(e) => updateProfile(idx, 'name', e.target.value)}
                                        className="flex-1 bg-slate-50 border-slate-200"
                                        placeholder={t('provider.wizard.profileNamePlaceholder')}
                                    />
                                    <Input
                                        value={profile.pin}
                                        onChange={(e) => updateProfile(idx, 'pin', e.target.value)}
                                        className="w-24 bg-slate-50 border-slate-200"
                                        placeholder="PIN"
                                    />
                                    <button
                                        onClick={() => removeProfile(idx)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Key size={20} className="text-blue-500" />
                    {t('provider.wizard.licenseDetails')}
                </h3>

                <div className="flex gap-4 mb-6">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors">
                        <input
                            type="radio"
                            checked={data.licenseType === 'serial'}
                            onChange={() => onChange({ licenseType: 'serial' })}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium">{t('provider.wizard.serial')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-colors">
                        <input
                            type="radio"
                            checked={data.licenseType === 'email_invite'}
                            onChange={() => onChange({ licenseType: 'email_invite' })}
                            className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium">{t('provider.wizard.emailActivation')}</span>
                    </label>
                </div>

                {data.licenseType === 'serial' && (
                    <div>
                        <Label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                            {t('provider.wizard.bulkKeys')}
                        </Label>
                        <Textarea
                            value={data.licenseKeys}
                            onChange={(e) => onChange({ licenseKeys: e.target.value })}
                            placeholder="XXXX-XXXX-XXXX-001&#10;XXXX-XXXX-XXXX-002"
                            rows={8}
                            className="w-full bg-slate-50 border-slate-200 font-mono text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            {t('provider.wizard.stockDetection')}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // --- EDUCATION FORM ---
    if (data.category === 'course') {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Video size={20} className="text-purple-500" />
                    {t('provider.wizard.courseFormat')}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => onChange({ contentType: 'live_meet' })}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${data.contentType === 'live_meet' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}
                    >
                        <Calendar className="mx-auto mb-2 text-purple-600" size={24} />
                        <div className="font-bold text-sm">{t('provider.wizard.liveMeet')}</div>
                    </button>
                    <button
                        onClick={() => onChange({ contentType: 'recorded_iframe' })}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${data.contentType === 'recorded_iframe' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}
                    >
                        <Monitor className="mx-auto mb-2 text-purple-600" size={24} />
                        <div className="font-bold text-sm">{t('provider.wizard.recorded')}</div>
                    </button>
                </div>

                {data.contentType === 'live_meet' ? (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                                {t('provider.wizard.dateTime')}
                            </Label>
                            <Input
                                type="datetime-local"
                                value={data.liveDate}
                                onChange={(e) => onChange({ liveDate: e.target.value })}
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                                {t('provider.wizard.meetingLink')}
                            </Label>
                            <Input
                                type="url"
                                value={data.resourceUrl}
                                onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                placeholder="https://meet.google.com/..."
                                className="bg-slate-50 border-slate-200 text-blue-600"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                                {t('provider.wizard.iframeCode')}
                            </Label>
                            <Textarea
                                value={data.resourceUrl}
                                onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                placeholder="<iframe src='...'></iframe>"
                                rows={4}
                                className="bg-slate-50 border-slate-200 font-mono text-xs"
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-orange-500" />
                    {t('provider.wizard.digitalResources')}
                </h3>

                <div className="flex gap-6">
                    <div className="w-32 h-44 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-colors">
                        <ImageIcon size={24} className="mb-2" />
                        <span className="text-xs font-bold text-center">{t('provider.wizard.cover')}</span>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase mb-1">
                                {t('provider.wizard.downloadLink')}
                            </Label>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                <LinkIcon size={18} className="text-slate-400 ml-2" />
                                <Input
                                    type="url"
                                    value={data.resourceUrl}
                                    onChange={(e) => onChange({ resourceUrl: e.target.value })}
                                    className="bg-transparent border-none shadow-none focus-visible:ring-0"
                                    placeholder="https://..."
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

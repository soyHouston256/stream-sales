'use client';

import { Tv, Key, Video, BookOpen, Cpu } from 'lucide-react';
import { ProductCategory } from '@/types/provider';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepCategoryProps {
    selectedCategory: ProductCategory | null;
    onSelect: (category: ProductCategory) => void;
}

export function StepCategory({ selectedCategory, onSelect }: StepCategoryProps) {
    const { t } = useLanguage();

    const categories = [
        { id: 'streaming', icon: Tv, color: 'red' },
        { id: 'license', icon: Key, color: 'blue' },
        { id: 'course', icon: Video, color: 'purple' },
        { id: 'ebook', icon: BookOpen, color: 'orange' },
        { id: 'ai', icon: Cpu, color: 'teal' },
    ] as const;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;

                return (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id as ProductCategory)}
                        className={`
              p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-105
              ${isSelected
                                ? `border-${cat.color}-500 bg-${cat.color}-50 ring-2 ring-${cat.color}-200`
                                : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'
                            }
            `}
                    >
                        <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
              ${isSelected ? `bg-${cat.color}-100 text-${cat.color}-600` : `bg-${cat.color}-50 text-${cat.color}-500`}
            `}>
                            <Icon size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">{t(`provider.wizard.categories.${cat.id}`)}</h3>
                        <p className="text-sm text-slate-500 mt-1">{t(`provider.wizard.categories.${cat.id}Desc`)}</p>
                    </button>
                );
            })}
        </div>
    );
}

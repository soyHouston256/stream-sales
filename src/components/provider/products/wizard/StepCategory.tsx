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
                                ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20 ring-2 ring-${cat.color}-200 dark:ring-${cat.color}-900`
                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg'
                            }
            `}
                    >
                        <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors
              ${isSelected ? `bg-${cat.color}-100 dark:bg-${cat.color}-900/40 text-${cat.color}-600 dark:text-${cat.color}-400` : `bg-${cat.color}-50 dark:bg-slate-800 text-${cat.color}-500 dark:text-${cat.color}-400`}
            `}>
                            <Icon size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{t(`provider.wizard.categories.${cat.id}`)}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t(`provider.wizard.categories.${cat.id}Desc`)}</p>
                    </button>
                );
            })}
        </div>
    );
}

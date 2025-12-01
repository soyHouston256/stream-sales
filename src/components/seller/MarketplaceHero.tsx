import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function MarketplaceHero() {
    const { t } = useLanguage();

    return (
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white shadow-2xl mb-8">
            {/* Background Pattern/Image Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                {/* Left Content */}
                <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20 text-sm font-medium text-yellow-300">
                        <Zap size={16} className="fill-yellow-300" />
                        <span>{t('seller.hero.automatedDelivery')}</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
                        {t('seller.hero.subscriptionsAnd')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                            {t('seller.hero.licenses')}
                        </span>
                    </h1>

                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl md:text-4xl font-bold text-yellow-400">{t('seller.hero.saveUpTo')}</span>
                    </div>
                </div>

                {/* Right Content - Flash Offer Card */}
                <div className="flex justify-center lg:justify-end">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold">{t('seller.hero.flashOffer')}</h3>
                                <p className="text-indigo-200 text-sm">{t('seller.hero.endsIn')}</p>
                            </div>
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">-65%</span>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-4 mb-6 border border-white/10">
                            <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center text-2xl font-bold">
                                N
                            </div>
                            <div>
                                <h4 className="font-bold">{t('seller.hero.exampleProduct.name')}</h4>
                                <p className="text-xs text-slate-300">{t('seller.hero.exampleProduct.description')}</p>
                            </div>
                        </div>

                        <Button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-bold py-6 text-lg">
                            {t('seller.hero.buyFor')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

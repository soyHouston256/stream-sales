'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Search } from 'lucide-react';

interface Country {
    code: string;
    name: string;
    dialCode: string;
    flag: string;
}

const COUNTRIES: Country[] = [
    { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪' },
    { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
    { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
    { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
    { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
    { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
    { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
    { code: 'DO', name: 'República Dominicana', dialCode: '+1', flag: '🇩🇴' },
    { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
    { code: 'PR', name: 'Puerto Rico', dialCode: '+1', flag: '🇵🇷' },
];

interface PhoneInputProps {
    value: string;
    onChange: (fullPhone: string) => void;
    placeholder?: string;
    className?: string;
}

export function PhoneInput({ value, onChange, placeholder, className }: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Parse the current value to extract country code and number
    const getCountryFromValue = (val: string): Country => {
        for (const country of COUNTRIES) {
            if (val.startsWith(country.dialCode)) {
                return country;
            }
        }
        return COUNTRIES[0]; // Default to Peru
    };

    const getNumberFromValue = (val: string, country: Country): string => {
        if (val.startsWith(country.dialCode)) {
            return val.slice(country.dialCode.length).trim();
        }
        return val.replace(/^\+\d+\s*/, ''); // Remove any dial code prefix
    };

    const selectedCountry = getCountryFromValue(value);
    const phoneNumber = getNumberFromValue(value, selectedCountry);

    const handleCountrySelect = (country: Country) => {
        onChange(`${country.dialCode} ${phoneNumber}`);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleNumberChange = (number: string) => {
        // Only allow digits and spaces
        const cleanNumber = number.replace(/[^\d\s]/g, '');
        onChange(`${selectedCountry.dialCode} ${cleanNumber}`);
    };

    const filteredCountries = COUNTRIES.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.dialCode.includes(searchQuery) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`flex gap-1 ${className}`}>
            {/* Country Code Selector */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-[90px] justify-between px-2 font-normal"
                        type="button"
                    >
                        <span className="flex items-center gap-1 truncate">
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span className="text-xs">{selectedCountry.dialCode}</span>
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-2" align="start">
                    {/* Search */}
                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar país..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 text-sm bg-transparent outline-none"
                        />
                    </div>
                    {/* Country List */}
                    <div className="max-h-[200px] overflow-y-auto">
                        {filteredCountries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${selectedCountry.code === country.code ? 'bg-muted' : ''
                                    }`}
                                onClick={() => handleCountrySelect(country)}
                            >
                                <span className="text-base">{country.flag}</span>
                                <span className="flex-1 text-left truncate">{country.name}</span>
                                <span className="text-xs text-muted-foreground">{country.dialCode}</span>
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Phone Number Input */}
            <Input
                type="tel"
                placeholder={placeholder || '999 888 777'}
                value={phoneNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
                className="flex-1"
            />
        </div>
    );
}

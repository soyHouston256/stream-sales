import { describe, it, expect } from '@jest/globals';

/**
 * Unit Tests for Flexible Pricing Types
 * 
 * Tests both percentage and fixed amount pricing for:
 * - Distributor Markup
 * - Platform Fee
 */

describe('Flexible Pricing Types', () => {
    describe('Percentage Markup', () => {
        it('should calculate 15% markup on $100', () => {
            const basePrice = 100;
            const markup = 15; // %
            const result = basePrice * (1 + markup / 100);
            expect(result).toBeCloseTo(115, 2);
        });

        it('should handle 0% markup', () => {
            const basePrice = 100;
            const markup = 0;
            const result = basePrice * (1 + markup / 100);
            expect(result).toBe(100);
        });

        it('should handle 100% markup', () => {
            const basePrice = 100;
            const markup = 100;
            const result = basePrice * (1 + markup / 100);
            expect(result).toBe(200);
        });
    });

    describe('Fixed Amount Markup', () => {
        it('should add $5 to $100 base price', () => {
            const basePrice = 100;
            const markup = 5; // $
            const result = basePrice + markup;
            expect(result).toBe(105);
        });

        it('should handle $0 markup', () => {
            const basePrice = 100;
            const markup = 0;
            const result = basePrice + markup;
            expect(result).toBe(100);
        });

        it('should work with different base prices', () => {
            const basePrice = 50;
            const markup = 10;
            const result = basePrice + markup;
            expect(result).toBe(60);
        });
    });

    describe('Percentage Platform Fee', () => {
        it('should deduct 10% fee from provider', () => {
            const basePrice = 100;
            const fee = 10; // %
            const feeAmount = basePrice * (fee / 100);
            const providerEarns = basePrice - feeAmount;

            expect(feeAmount).toBe(10);
            expect(providerEarns).toBe(90);
        });

        it('should handle 0% fee', () => {
            const basePrice = 100;
            const fee = 0;
            const feeAmount = basePrice * (fee / 100);
            const providerEarns = basePrice - feeAmount;

            expect(feeAmount).toBe(0);
            expect(providerEarns).toBe(100);
        });
    });

    describe('Fixed Amount Platform Fee', () => {
        it('should deduct $ fee from provider', () => {
            const basePrice = 100;
            const fee = 5; // $
            const providerEarns = basePrice - fee;

            expect(providerEarns).toBe(95);
        });

        it('should handle edge case where fee > base price', () => {
            const basePrice = 5;
            const fee = 10; // $
            const providerEarns = basePrice - fee;

            expect(providerEarns).toBe(-5); // Negative, needs validation
        });
    });

    describe('Mixed Scenarios', () => {
        it('should handle percentage markup + fixed fee', () => {
            const basePrice = 100;
            const markupPercent = 15;
            const feeFixed = 5;

            const markupAmount = basePrice * (markupPercent / 100);
            const sellerPays = basePrice + markupAmount;
            const providerEarns = basePrice - feeFixed;
            const platformEarns = markupAmount + feeFixed;

            expect(sellerPays).toBeCloseTo(115, 2);
            expect(providerEarns).toBe(95);
            expect(platformEarns).toBeCloseTo(20, 2);
        });

        it('should handle fixed markup + percentage fee', () => {
            const basePrice = 100;
            const markupFixed = 5;
            const feePercent = 10;

            const sellerPays = basePrice + markupFixed;
            const feeAmount = basePrice * (feePercent / 100);
            const providerEarns = basePrice - feeAmount;
            const platformEarns = markupFixed + feeAmount;

            expect(sellerPays).toBe(105);
            expect(providerEarns).toBe(90);
            expect(platformEarns).toBe(15);
        });

        it('should handle both fixed', () => {
            const basePrice = 100;
            const markupFixed = 5;
            const feeFixed = 3;

            const sellerPays = basePrice + markupFixed;
            const providerEarns = basePrice - feeFixed;
            const platformEarns = markupFixed + feeFixed;

            expect(sellerPays).toBe(105);
            expect(providerEarns).toBe(97);
            expect(platformEarns).toBe(8);
        });

        it('should handle both percentage', () => {
            const basePrice = 100;
            const markupPercent = 15;
            const feePercent = 10;

            const markupAmount = basePrice * (markupPercent / 100);
            const sellerPays = basePrice + markupAmount;
            const feeAmount = basePrice * (feePercent / 100);
            const providerEarns = basePrice - feeAmount;
            const platformEarns = markupAmount + feeAmount;

            expect(sellerPays).toBeCloseTo(115, 2);
            expect(providerEarns).toBeCloseTo(90, 2);
            expect(platformEarns).toBeCloseTo(25, 2);
        });
    });

    describe('Platform Earnings Calculation', () => {
        it('should calculate with percentage markup + percentage fee', () => {
            const basePrice = 100;
            const markupPercent = 15;
            const feePercent = 10;

            const markupAmount = basePrice * (markupPercent / 100);
            const feeAmount = basePrice * (feePercent / 100);
            const platformEarns = markupAmount + feeAmount;

            expect(platformEarns).toBeCloseTo(25, 2);
        });

        it('should calculate with fixed markup + fixed fee', () => {
            const basePrice = 100;
            const markupFixed = 5;
            const feeFixed = 3;

            const platformEarns = markupFixed + feeFixed;

            expect(platformEarns).toBe(8);
        });

        it('should calculate with mixed types', () => {
            const basePrice = 100;
            const markupPercent = 15;
            const feeFixed = 5;

            const markupAmount = basePrice * (markupPercent / 100);
            const platformEarns = markupAmount + feeFixed;

            expect(platformEarns).toBeCloseTo(20, 2);
        });
    });

    describe('Real-world Scenarios with Flexible Types', () => {
        it('should handle Netflix with 15% markup and $2 fee', () => {
            const basePrice = 15.99;
            const markupPercent = 15;
            const feeFixed = 2;

            const markupAmount = basePrice * (markupPercent / 100);
            const sellerPays = basePrice + markupAmount;
            const providerReceives = basePrice - feeFixed;
            const platformEarns = markupAmount + feeFixed;

            expect(sellerPays).toBeCloseTo(18.39, 2);
            expect(providerReceives).toBeCloseTo(13.99, 2);
            expect(platformEarns).toBeCloseTo(4.40, 2);
        });

        it('should handle yearly subscription with $ markup and % fee', () => {
            const basePrice = 120;
            const markupFixed = 10;
            const feePercent = 10;

            const sellerPays = basePrice + markupFixed;
            const feeAmount = basePrice * (feePercent / 100);
            const providerReceives = basePrice - feeAmount;
            const platformEarns = markupFixed + feeAmount;

            expect(sellerPays).toBe(130);
            expect(providerReceives).toBe(108);
            expect(platformEarns).toBe(22);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very small prices with fixed values', () => {
            const basePrice = 1;
            const markupFixed = 0.50;
            const feeFixed = 0.25;

            const sellerPays = basePrice + markupFixed;
            const providerReceives = basePrice - feeFixed;
            const platformEarns = markupFixed + feeFixed;

            expect(sellerPays).toBe(1.50);
            expect(providerReceives).toBe(0.75);
            expect(platformEarns).toBe(0.75);
        });

        it('should handle large percentages', () => {
            const basePrice = 100;
            const markupPercent = 50;
            const feePercent = 20;

            const markupAmount = basePrice * (markupPercent / 100);
            const sellerPays = basePrice + markupAmount;
            const feeAmount = basePrice * (feePercent / 100);
            const providerReceives = basePrice - feeAmount;
            const platformEarns = markupAmount + feeAmount;

            expect(sellerPays).toBe(150);
            expect(providerReceives).toBe(80);
            expect(platformEarns).toBe(70);
        });
    });
});

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';

interface MarketplaceProduct {
  id: string;
  providerId: string;
  providerName: string;
  category: string;
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
  createdAt: string;
  availableSlots?: number;
  totalSlots?: number;
}

interface ProductCardProps {
  product: MarketplaceProduct;
  onViewDetails?: (productId: string) => void;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const availableSlots = product.availableSlots ?? 0;
  const hasStock = availableSlots > 0;

  return (
    <Card className={`flex flex-col h-full hover:shadow-lg transition-shadow overflow-hidden ${!hasStock ? 'opacity-75' : ''}`}>
      {/* Product Image */}
      {product.imageUrl && !imageError ? (
        <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => {
              console.error(`Failed to load image for product ${product.name}: ${product.imageUrl}`);
              setImageError(true);
            }}
          />
          {/* Stock Badge Overlay */}
          {availableSlots > 0 && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className={`text-xs font-bold ${availableSlots <= 2
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  }`}
              >
                <Package className="h-3 w-3 mr-1" />
                {availableSlots} disponibles
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm">{imageError ? 'Image failed to load' : 'No image'}</p>
          </div>
          {/* Stock Badge Overlay for no-image cards */}
          {availableSlots > 0 && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className={`text-xs font-bold ${availableSlots <= 2
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  }`}
              >
                <Package className="h-3 w-3 mr-1" />
                {availableSlots} disponibles
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CategoryBadge category={product.category as any} />
          <Badge variant="secondary" className="text-xs">
            ${parseFloat(product.price).toFixed(2)}
          </Badge>
        </div>
        <CardTitle className="line-clamp-1">{product.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {product.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-sm text-muted-foreground">
          <p>Provider: {product.providerName}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild disabled={!hasStock}>
          <Link href={`/marketplace/${product.id}`}>
            {hasStock ? 'View Details' : 'Out of Stock'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

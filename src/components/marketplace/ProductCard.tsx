'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge } from '@/components/provider/CategoryBadge';

interface MarketplaceProduct {
  id: string;
  providerId: string;
  providerName: string;
  category: string;
  name: string;
  description: string;
  price: string;
  createdAt: string;
}

interface ProductCardProps {
  product: MarketplaceProduct;
  onViewDetails?: (productId: string) => void;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
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
        <Button
          className="w-full"
          onClick={() => onViewDetails?.(product.id)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarketplaceProduct } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { ShoppingCart } from 'lucide-react';
import { truncateText, formatCurrency } from '@/lib/utils/seller';

interface ProductCardProps {
  product: MarketplaceProduct;
  onBuyClick: (product: MarketplaceProduct) => void;
}

export function ProductCard({ product, onBuyClick }: ProductCardProps) {
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CategoryBadge category={product.category} />
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
          </div>
        </div>
        <CardTitle className="mt-2">{product.name}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          by {product.providerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {truncateText(product.description, 120)}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onBuyClick(product)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Buy Now
        </Button>
      </CardFooter>
    </Card>
  );
}

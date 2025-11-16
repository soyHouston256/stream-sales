'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { ArrowLeft, ShoppingCart, User, Calendar, Package } from 'lucide-react';
import { tokenManager } from '@/lib/utils/tokenManager';

interface ProductDetails {
  id: string;
  providerId: string;
  category: string;
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/marketplace/${productId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Product not found or no longer available');
        } else {
          setError('Failed to load product details');
        }
        return;
      }

      const data = await response.json();
      setProduct(data);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = () => {
    const token = tokenManager.getToken();

    if (!token) {
      // Not logged in - redirect to login
      router.push('/login?redirect=/marketplace/' + productId);
      return;
    }

    // Logged in - redirect to seller dashboard to complete purchase
    router.push('/dashboard/seller?action=purchase&productId=' + productId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error || 'Product not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providerName = product.provider.name || product.provider.email.split('@')[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Product Image */}
          <div>
            {product.imageUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg shadow-lg flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <Package className="mx-auto h-24 w-24 text-gray-400" />
                  <p className="mt-4 text-lg">No image available</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CategoryBadge category={product.category as any} className="mb-2" />
                    <CardTitle className="text-3xl">{product.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-2xl px-4 py-2">
                    ${parseFloat(product.price).toFixed(2)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>

                <Separator />

                {/* Provider Info */}
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Provided by</p>
                    <p className="font-medium">{providerName}</p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Listed on</p>
                    <p className="font-medium">
                      {new Date(product.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Purchase Button */}
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full text-lg"
                    onClick={handlePurchase}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Purchase Now - ${parseFloat(product.price).toFixed(2)}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Secure instant delivery after payment
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Instant access to account credentials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Secure encrypted delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>24/7 customer support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Purchase protection guarantee</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

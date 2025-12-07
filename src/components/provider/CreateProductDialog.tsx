'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProduct } from '@/lib/hooks/useProducts';
import {
  createProductSchema,
  CreateProductInput,
} from '@/lib/validations/product';
import { Plus } from 'lucide-react';
import { ImageUpload } from '@/components/shared/ImageUpload';

interface CreateProductDialogProps {
  trigger?: React.ReactNode;
}

export function CreateProductDialog({ trigger }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const createProduct = useCreateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      category: 'netflix',
      price: 0,
    },
  });

  const category = watch('category');
  const imageUrl = watch('imageUrl');

  const onSubmit = async (data: CreateProductInput) => {
    try {
      await createProduct.mutateAsync(data);
      setOpen(false);
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new digital product to your catalog. Fill in all the required
            information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(value) =>
                setValue('category', value as any, { shouldValidate: true })
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="netflix">Netflix</SelectItem>
                <SelectItem value="spotify">Spotify</SelectItem>
                <SelectItem value="hbo">HBO</SelectItem>
                <SelectItem value="disney">Disney+</SelectItem>
                <SelectItem value="prime">Prime Video</SelectItem>
                <SelectItem value="youtube">YouTube Premium</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Premium Account - 4K"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the product details, features, duration, etc."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">
              Price (USD) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('price', { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Product Image</Label>
            <ImageUpload
              value={imageUrl}
              onChange={(value) => setValue('imageUrl', value, { shouldValidate: true })}
            />
            {errors.imageUrl && (
              <p className="text-sm text-red-500">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountEmail">
              Account Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accountEmail"
              type="email"
              placeholder="account@example.com"
              {...register('accountEmail')}
            />
            {errors.accountEmail && (
              <p className="text-sm text-red-500">
                {errors.accountEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountPassword">
              Account Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accountPassword"
              type="password"
              placeholder="••••••••"
              {...register('accountPassword')}
            />
            {errors.accountPassword && (
              <p className="text-sm text-red-500">
                {errors.accountPassword.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Password will be encrypted and only visible to buyer after purchase.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountDetails">Account Details (Optional)</Label>
            <Textarea
              id="accountDetails"
              placeholder='Additional info as JSON, e.g., {"profile": "Profile 1", "pin": "1234"}'
              rows={2}
              {...register('accountDetails')}
            />
            <p className="text-xs text-muted-foreground">
              Additional account information (will be parsed as JSON).
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

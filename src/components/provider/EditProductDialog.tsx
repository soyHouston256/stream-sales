'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProduct } from '@/lib/hooks/useProducts';
import {
  updateProductSchema,
  UpdateProductInput,
} from '@/lib/validations/product';
import { Product } from '@/types/provider';
import { ImageUpload } from '@/components/shared/ImageUpload';

interface EditProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: EditProductDialogProps) {
  const updateProduct = useUpdateProduct();



  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
  });

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    if (open && product) {
      reset({
        name: product.name,
        description: product.description,
        price: parseFloat(product.price || product.variants?.[0]?.price || '0'),
        accountEmail: product.accountEmail,
        imageUrl: product.imageUrl || '',
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (data: UpdateProductInput) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, data });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product information. Only available products can be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Product Name</Label>
            <Input id="edit-name" {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
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
            <Label htmlFor="edit-price">Price (USD)</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              {...register('price', { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-accountEmail">Account Email</Label>
            <Input
              id="edit-accountEmail"
              type="email"
              {...register('accountEmail')}
            />
            {errors.accountEmail && (
              <p className="text-sm text-red-500">
                {errors.accountEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-accountPassword">
              New Account Password (Optional)
            </Label>
            <Input
              id="edit-accountPassword"
              type="password"
              placeholder="Leave blank to keep current password"
              {...register('accountPassword')}
            />
            {errors.accountPassword && (
              <p className="text-sm text-red-500">
                {errors.accountPassword.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending}>
              {updateProduct.isPending ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

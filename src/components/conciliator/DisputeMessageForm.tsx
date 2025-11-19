'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { addMessageSchema, AddMessageFormData } from '@/lib/validations/conciliator';
import { useAddMessage } from '@/lib/hooks/useDisputeMessages';

interface DisputeMessageFormProps {
  disputeId: string;
  onSuccess?: () => void;
}

export function DisputeMessageForm({ disputeId, onSuccess }: DisputeMessageFormProps) {
  const addMessage = useAddMessage();

  const form = useForm<AddMessageFormData>({
    resolver: zodResolver(addMessageSchema),
    defaultValues: {
      message: '',
      isInternal: false,
      attachments: [],
    },
  });

  const isInternal = form.watch('isInternal');

  const onSubmit = async (data: AddMessageFormData) => {
    await addMessage.mutateAsync({
      disputeId,
      data,
    });

    form.reset();
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isInternal ? (
            <>
              <Lock className="h-5 w-5" />
              Add Internal Note
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Send Message
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isInternal
            ? 'Internal notes are only visible to conciliators'
            : 'Messages are visible to both the seller and provider'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        isInternal
                          ? 'Add internal notes about your investigation or decision-making process...'
                          : 'Write a message to the seller and provider...'
                      }
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 5 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isInternal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Internal Note
                    </FormLabel>
                    <FormDescription>
                      Check this box to make this message visible only to conciliators
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={addMessage.isPending}
            >
              {addMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isInternal ? (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Add Internal Note
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

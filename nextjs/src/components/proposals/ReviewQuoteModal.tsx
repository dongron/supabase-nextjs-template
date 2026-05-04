'use client';

import React, { useState } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuoteService } from '@/lib/quote';

interface ReviewQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: QuoteService[];
  onSave: (services: QuoteService[]) => void;
  isSaving?: boolean;
}

export default function ReviewQuoteModal({
  open,
  onOpenChange,
  services,
  onSave,
  isSaving = false,
}: ReviewQuoteModalProps) {
  const [localServices, setLocalServices] = useState<QuoteService[]>(services);

  // Sync local state when modal opens with fresh services
  React.useEffect(() => {
    if (open) {
      setLocalServices(services);
    }
  }, [open, services]);

  function handleNameChange(index: number, value: string) {
    setLocalServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, serviceName: value } : s)),
    );
  }

  function handlePriceChange(index: number, value: string) {
    const parsed = value === '' ? null : parseFloat(value);
    setLocalServices((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, price: parsed !== null && !isNaN(parsed) ? parsed : null } : s,
      ),
    );
  }

  function handleDeleteRow(index: number) {
    setLocalServices((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddRow() {
    setLocalServices((prev) => [
      ...prev,
      { serviceId: null, serviceName: '', price: null },
    ]);
  }

  function handleSave() {
    onSave(localServices);
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Quote</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {localServices.map((service, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 flex-shrink-0">
                {service.serviceId !== null ? (
                  <CheckCircle2
                    className="h-5 w-5 text-green-500"
                    aria-label="Matched service"
                  />
                ) : (
                  <span className="h-5 w-5 block" aria-hidden="true" />
                )}
              </span>

              <Input
                className="flex-1"
                value={service.serviceName}
                onChange={(e) => handleNameChange(index, e.target.value)}
                aria-label={`Service name for row ${index + 1}`}
                placeholder="Service name"
              />

              <Input
                className="w-28"
                value={service.price !== null ? String(service.price) : ''}
                onChange={(e) => handlePriceChange(index, e.target.value)}
                aria-label={`Price for row ${index + 1}`}
                placeholder="Price"
                type="number"
                min="0"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteRow(index)}
                aria-label={`Remove ${service.serviceName || `row ${index + 1}`}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={handleAddRow} className="mt-2">
            Add Row
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

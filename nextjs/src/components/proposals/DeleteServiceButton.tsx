'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
  serviceId: string;
  serviceName: string;
};

export default function DeleteServiceButton({ serviceId, serviceName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    const res = await fetch(`/api/app/services/${serviceId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      startTransition(() => {
        router.refresh();
      });
    }

    setConfirming(false);
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">Remove?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
          aria-label={`Confirm remove ${serviceName}`}
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={isPending}
      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
      aria-label={`Remove ${serviceName}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

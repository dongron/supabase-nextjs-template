// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewQuoteModal from '../ReviewQuoteModal';
import type { QuoteService } from '@/lib/quote';

const matchedService: QuoteService = {
  serviceId: 'svc-1',
  serviceName: 'Garden Lighting',
  price: 4500,
};

const unmatchedService: QuoteService = {
  serviceId: null,
  serviceName: 'Custom Stone Arch',
  price: null,
};

function renderModal(
  services: QuoteService[] = [matchedService, unmatchedService],
  onSave = vi.fn(),
  onOpenChange = vi.fn(),
) {
  return render(
    <ReviewQuoteModal
      open
      onOpenChange={onOpenChange}
      services={services}
      onSave={onSave}
    />,
  );
}

describe('ReviewQuoteModal', () => {
  it('renders matched service with checkmark icon', () => {
    renderModal();
    expect(screen.getByLabelText('Matched service')).toBeInTheDocument();
  });

  it('renders service names as editable inputs', () => {
    renderModal();
    expect(screen.getByDisplayValue('Garden Lighting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom Stone Arch')).toBeInTheDocument();
  });

  it('renders matched service price as editable input', () => {
    renderModal();
    expect(screen.getByDisplayValue('4500')).toBeInTheDocument();
  });

  it('renders unmatched service price as empty input', () => {
    renderModal();
    // null price → empty string in input
    const priceInputs = screen.getAllByPlaceholderText('Price');
    expect(priceInputs[1]).toHaveValue(null); // type=number input with no value
  });

  it('allows editing a service name', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByDisplayValue('Garden Lighting');
    await user.clear(input);
    await user.type(input, 'Updated Lighting');
    expect(input).toHaveValue('Updated Lighting');
  });

  it('allows editing a price', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByDisplayValue('4500');
    await user.clear(input);
    await user.type(input, '5000');
    expect(input).toHaveValue(5000);
  });

  it('Add Row appends a blank row', async () => {
    const user = userEvent.setup();
    renderModal();
    const initialRows = screen.getAllByPlaceholderText('Service name');
    expect(initialRows).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /add row/i }));
    const updatedRows = screen.getAllByPlaceholderText('Service name');
    expect(updatedRows).toHaveLength(3);
    expect(updatedRows[2]).toHaveValue('');
  });

  it('Delete removes the row', async () => {
    const user = userEvent.setup();
    renderModal();
    const deleteButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(deleteButtons[0]);
    expect(screen.queryByDisplayValue('Garden Lighting')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom Stone Arch')).toBeInTheDocument();
  });

  it('Save calls onSave with current services state', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderModal([matchedService], onSave);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith([matchedService]);
  });

  it('Cancel does not call onSave', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderModal([matchedService], onSave);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Save button is disabled when isSaving is true', () => {
    const { rerender } = render(
      <ReviewQuoteModal
        open
        onOpenChange={vi.fn()}
        services={[matchedService]}
        onSave={vi.fn()}
        isSaving
      />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    rerender(
      <ReviewQuoteModal
        open
        onOpenChange={vi.fn()}
        services={[matchedService]}
        onSave={vi.fn()}
        isSaving={false}
      />,
    );
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
  });
});

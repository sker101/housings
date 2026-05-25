import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ListingCard from '../../components/ListingCard';
import { describe, it, expect, vi } from 'vitest';

describe('ListingCard', () => {
  const defaultListing = {
    id: 'test-123',
    title: 'Beautiful 2 Bedroom',
    location: 'Masaki, Dar es Salaam',
    priceMonthly: 1200000,
    serviceChargeTzs: 50000,
    imageUrl: '/test-img.jpg',
    vacancyStatus: 'available',
  };

  it('renders standard listing information correctly', () => {
    render(
      <MemoryRouter>
        <ListingCard listing={defaultListing} />
      </MemoryRouter>
    );

    expect(screen.getByText('Beautiful 2 Bedroom')).toBeInTheDocument();
    expect(screen.getByText('Masaki, Dar es Salaam')).toBeInTheDocument();
    // 1.25m total (price + service charge)
    expect(screen.getByText(/1,250,000/)).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders coming soon badge and CTA correctly', () => {
    const comingSoonListing = {
      ...defaultListing,
      vacancyStatus: 'coming_soon',
      availableFrom: '2026-10-01',
    };

    const mockSave = vi.fn();

    render(
      <MemoryRouter>
        <ListingCard listing={comingSoonListing} onSave={mockSave} />
      </MemoryRouter>
    );

    const inakujaElements = screen.getAllByText(/Inakuja|baada ya siku/);
    expect(inakujaElements.length).toBeGreaterThan(0);
    
    // Test that the Save & Notify CTA appears
    const saveButton = screen.getByRole('button', { name: /Hifadhi na uarifwe/i });
    expect(saveButton).toBeInTheDocument();
    
    saveButton.click();
    expect(mockSave).toHaveBeenCalledWith('test-123');
  });
});

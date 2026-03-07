import { render, screen } from '@testing-library/react';
import React from 'react';
import SkeletonCard from './SkeletonCard';

describe('SkeletonCard', () => {
    it('renders the skeleton pulse animations', () => {
        const { container } = render(<SkeletonCard />);
        expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
    });
});

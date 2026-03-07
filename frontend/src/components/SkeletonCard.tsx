import React from 'react';

export default function SkeletonCard() {
    return (
        <article className="skeleton-card" aria-hidden="true">
            <div className="skeleton-card__image-placeholder pulse-animation" />
            <div className="skeleton-card__content">
                <div className="skeleton-card__title pulse-animation" />
                <div className="skeleton-card__address pulse-animation" />
                <div className="skeleton-card__meta-group">
                    <div className="skeleton-card__pill pulse-animation" />
                    <div className="skeleton-card__pill pulse-animation" />
                </div>
            </div>
        </article>
    );
}

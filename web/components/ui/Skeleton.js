'use client';

import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', className = '', style = {} }) {
  return (
    <div
      className={`ui-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Skeleton width="40%" height="24px" />
      <Skeleton width="85%" height="16px" />
      <Skeleton width="60%" height="16px" />
    </div>
  );
}

'use client';

import React from 'react';

export function EmptyState({ icon: Icon, title, description, action = null, className = '' }) {
  return (
    <div className={`ui-empty-state ${className}`}>
      {Icon && (
        <div className="ui-empty-state-icon" aria-hidden="true">
          <Icon size={26} />
        </div>
      )}
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

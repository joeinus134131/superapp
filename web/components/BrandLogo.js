'use client';

export const BrandLogo = ({
  size = 38,
  showText = true,
  showTagline = false,
  textSize = '22px',
  variant = 'icon',
  className = '',
}) => {
  if (variant === 'horizontal' || (showText && showTagline)) {
    const width = Math.round(size * 2.8);
    const height = Math.round((width * 119) / 392);
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <img
          src="/whenya-logo.png"
          alt="Whenya"
          width={width}
          height={height}
          style={{ height: size, width: 'auto', objectFit: 'contain' }}
        />
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={className} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="/whenya-vertical.png"
          alt="Whenya"
          style={{ height: size * 1.6, width: 'auto', objectFit: 'contain' }}
        />
      </div>
    );
  }

  const iconHeight = size;
  const iconWidth = Math.round((iconHeight * 290) / 195);

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/whenya-icon.png"
        alt="Whenya"
        width={iconWidth}
        height={iconHeight}
        style={{ width: iconWidth, height: iconHeight, objectFit: 'contain', flexShrink: 0 }}
      />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: textSize, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
            whenya
          </span>
          {showTagline && (
            <span style={{ fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--color-secondary, #68766E)', textTransform: 'uppercase', marginTop: '3px' }}>
              PLAN • FOCUS • LIVE BETTER
            </span>
          )}
        </div>
      )}
    </div>
  );
};



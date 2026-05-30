/** Partner-organization logos (LEPRA Society + IIHMR Bangalore).
 *
 *  Drop the actual image files into frontend/public/logos/ as
 *  lepra.png and iihmr.png (see README.txt in that folder).
 *
 *  Two render variants:
 *    <PartnerLogos />          standard, dark text — for light backgrounds (footer)
 *    <PartnerLogos onDark />   inverted/light text — for dark backgrounds (login hero)
 *
 *  LEPRA Society is rendered as a non-clickable label; IIHMR Bangalore is
 *  the only outgoing link (per partner-attribution preference).
 */
export default function PartnerLogos({ onDark = false, size = 'sm', className = '' }) {
  const sizeMap = {
    xs: { box: 'h-6', label: 'text-[9px]' },
    sm: { box: 'h-8', label: 'text-[10px]' },
    md: { box: 'h-10 md:h-12', label: 'text-[11px]' },
    lg: { box: 'h-14 md:h-16', label: 'text-xs' },
  };
  const s = sizeMap[size] || sizeMap.sm;
  const labelCls = onDark ? 'text-emerald-100/80' : 't-muted';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-4 ${className}`}>
      <span className={`hidden sm:inline ${labelCls} ${s.label} uppercase tracking-[0.18em] font-semibold shrink-0`}>
        In partnership with
      </span>
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
        <LogoChip
          src="/logos/lepra.png"
          alt="LEPRA Society"
          heightCls={s.box}
          onDark={onDark}
        />
        <span className={`hidden sm:inline ${onDark ? 'text-emerald-100/40' : 'text-ink-300'}`} aria-hidden="true">·</span>
        <LogoChip
          src="/logos/iihmr.png"
          alt="IIHMR Bangalore"
          href="https://iihmrbangalore.edu.in/"
          heightCls={s.box}
          onDark={onDark}
        />
      </div>
    </div>
  );
}

function LogoChip({ src, alt, href, heightCls, onDark }) {
  const baseCls = `inline-flex items-center justify-center ${heightCls} px-1`;
  // Light text on a dark hero — for the textual fallback when the image
  // file is missing — otherwise the dark-on-dark alt label is invisible.
  const fallbackTextCls = onDark
    ? 'text-emerald-50 text-xs font-semibold tracking-wide'
    : 'text-ink-700 text-xs font-semibold tracking-wide';

  const handleImgError = (e) => {
    const img = e.currentTarget;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.logo-fallback')) {
      const span = document.createElement('span');
      span.className = `logo-fallback ${fallbackTextCls}`;
      span.textContent = alt;
      parent.appendChild(span);
    }
  };

  const img = (
    <img
      src={src}
      alt={alt}
      className={`${heightCls} w-auto object-contain block`}
      loading="lazy"
      onError={handleImgError}
    />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={alt}
        className={`${baseCls} rounded-md transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400`}
      >
        {img}
      </a>
    );
  }

  return (
    <span title={alt} className={baseCls}>
      {img}
    </span>
  );
}

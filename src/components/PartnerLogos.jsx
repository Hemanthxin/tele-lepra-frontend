/** Partner-organization logos (LEPRA Society + IIHMR Bangalore).
 *
 *  Drop the actual image files into frontend/public/logos/ as
 *  lepra.png and iihmr.png (see README.txt in that folder).
 *
 *  Two render variants:
 *    <PartnerLogos />          standard, dark text — for light backgrounds (footer)
 *    <PartnerLogos onDark />   inverted/light text — for dark backgrounds (login hero)
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
  const bgChip = onDark ? 'bg-white/95' : 'bg-white';

  return (
    <div className={`flex items-center gap-3 md:gap-4 ${className}`}>
      <span className={`${labelCls} ${s.label} uppercase tracking-[0.18em] font-semibold shrink-0`}>
        In partnership with
      </span>
      <div className="flex items-center gap-2.5 md:gap-3">
        <LogoChip
          src="/logos/lepra.png"
          alt="LEPRA Society"
          href="https://www.leprahealthinaction.in/"
          heightCls={s.box}
          bgChip={bgChip}
        />
        <LogoChip
          src="/logos/iihmr.png"
          alt="IIHMR Bangalore"
          href="https://iihmrbangalore.edu.in/"
          heightCls={s.box}
          bgChip={bgChip}
        />
      </div>
    </div>
  );
}

function LogoChip({ src, alt, href, heightCls, bgChip }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={alt}
      className={`inline-flex items-center justify-center ${bgChip} rounded-md px-2.5 py-1.5 ring-1 ring-ink-200/60 hover:ring-emerald-400/60 hover:shadow-md transition`}
    >
      <img
        src={src}
        alt={alt}
        className={`${heightCls} w-auto object-contain block`}
        loading="lazy"
        // If the file is missing, hide the broken-image icon gracefully.
        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.textContent = alt; }}
      />
    </a>
  );
}

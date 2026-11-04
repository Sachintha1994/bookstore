import { useState } from 'react';

const sizeMap = {
  xs: { width: 34, height: 48, radius: 4, iconSize: 16, fontSize: 9 },
  sm: { width: 44, height: 62, radius: 6, iconSize: 18, fontSize: 10 },
  md: { width: 64, height: 90, radius: 8, iconSize: 24, fontSize: 11 },
  lg: { width: 110, height: 154, radius: 10, iconSize: 32, fontSize: 13 },
  xl: { width: 140, height: 196, radius: 12, iconSize: 40, fontSize: 14 },
};

export default function BookCover({ src, title = 'Book', size = 'md', className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const dims = sizeMap[size] || sizeMap.md;

  const hasImage = Boolean(src && failedSrc !== src);

  return (
    <div
      className={`book-cover book-cover-${size} ${className}`}
      style={{
        width: dims.width,
        height: dims.height,
        minWidth: dims.width,
        borderRadius: dims.radius,
      }}
      title={title}
      aria-label={`Cover of ${title}`}
    >
      {hasImage ? (
        <img
          src={src}
          alt={title}
          className="book-cover-img"
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="book-cover-placeholder">
          <svg
            className="book-cover-icon"
            width={dims.iconSize}
            height={dims.iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </svg>
          {size === 'lg' || size === 'xl' ? (
            <span className="book-cover-text">{title}</span>
          ) : null}
        </div>
      )}
      <div className="book-cover-spine" />
    </div>
  );
}

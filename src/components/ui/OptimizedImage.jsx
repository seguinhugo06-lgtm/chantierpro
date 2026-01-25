/**
 * OptimizedImage
 * Next.js Image-style optimization for React
 * Features: lazy loading, blur placeholder, responsive sizes, error handling
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * @typedef {Object} OptimizedImageProps
 * @property {string} src - Image source URL
 * @property {string} alt - Alt text for accessibility
 * @property {number} [width] - Explicit width
 * @property {number} [height] - Explicit height
 * @property {'cover' | 'contain' | 'fill' | 'none'} [objectFit] - Object fit mode
 * @property {'lazy' | 'eager'} [loading] - Loading strategy (default: lazy)
 * @property {boolean} [priority] - Load immediately (disables lazy loading)
 * @property {string} [placeholder] - Placeholder type: 'blur' | 'empty'
 * @property {string} [blurDataURL] - Base64 blur placeholder
 * @property {string} [sizes] - Responsive sizes attribute
 * @property {Function} [onLoad] - Called when image loads
 * @property {Function} [onError] - Called on load error
 * @property {string} [className] - Additional CSS classes
 * @property {string} [containerClassName] - Container CSS classes
 */

// Tiny 1x1 transparent GIF for placeholder
const EMPTY_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Generate a simple blur placeholder
const generateBlurPlaceholder = (color = '#e5e7eb') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect fill="${color}" width="8" height="8"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Default responsive sizes
const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

/**
 * OptimizedImage - Optimized image component with lazy loading and placeholders
 * @param {OptimizedImageProps} props
 */
const OptimizedImage = React.forwardRef(
  (
    {
      src,
      alt,
      width,
      height,
      objectFit = 'cover',
      loading: loadingProp,
      priority = false,
      placeholder = 'blur',
      blurDataURL,
      sizes = DEFAULT_SIZES,
      onLoad,
      onError,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const [isInView, setIsInView] = React.useState(priority);
    const imgRef = React.useRef(null);
    const containerRef = React.useRef(null);

    // Merge refs
    React.useImperativeHandle(ref, () => imgRef.current);

    // Determine loading strategy
    const loading = priority ? 'eager' : (loadingProp || 'lazy');

    // Generate blur placeholder if not provided
    const placeholderSrc = React.useMemo(() => {
      if (placeholder === 'empty') return EMPTY_PLACEHOLDER;
      return blurDataURL || generateBlurPlaceholder();
    }, [placeholder, blurDataURL]);

    // Intersection Observer for lazy loading with earlier trigger
    React.useEffect(() => {
      if (priority || loading === 'eager') {
        setIsInView(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '200px', // Start loading 200px before visible
          threshold: 0,
        }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }, [priority, loading]);

    // Handle image load
    const handleLoad = React.useCallback(
      (e) => {
        setIsLoaded(true);
        onLoad?.(e);
      },
      [onLoad]
    );

    // Handle image error
    const handleError = React.useCallback(
      (e) => {
        setHasError(true);
        onError?.(e);
      },
      [onError]
    );

    // Object fit class mapping
    const objectFitClass = {
      cover: 'object-cover',
      contain: 'object-contain',
      fill: 'object-fill',
      none: 'object-none',
    }[objectFit];

    // Style for explicit dimensions
    const containerStyle = {};
    if (width) containerStyle.width = typeof width === 'number' ? `${width}px` : width;
    if (height) containerStyle.height = typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden',
          containerClassName
        )}
        style={containerStyle}
      >
        {/* Blur placeholder */}
        {placeholder === 'blur' && !isLoaded && !hasError && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${placeholderSrc})`,
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Main image */}
        {isInView && !hasError && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              objectFitClass,
              isLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
            {...props}
          />
        )}

        {/* Error fallback */}
        {hasError && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
            )}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Loading shimmer effect */}
        {!isLoaded && !hasError && isInView && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{
              backgroundSize: '200% 100%',
            }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

/**
 * ResponsiveImage - Wrapper with srcSet support
 */
export function ResponsiveImage({
  src,
  alt,
  widths = [640, 750, 828, 1080, 1200],
  quality = 75,
  ...props
}) {
  // In production, this would generate srcSet from a CDN/image service
  // For now, we just use the single src
  const srcSet = React.useMemo(() => {
    // This is a placeholder for actual image optimization
    // In production, replace with actual image CDN URLs
    return widths
      .map((w) => `${src} ${w}w`)
      .join(', ');
  }, [src, widths]);

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      srcSet={srcSet}
      {...props}
    />
  );
}

/**
 * Avatar - Optimized avatar component
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallback,
  className,
  ...props
}) {
  const [hasError, setHasError] = React.useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
          'font-medium text-sm',
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        {fallback || alt?.[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      objectFit="cover"
      placeholder="blur"
      onError={() => setHasError(true)}
      className={cn('rounded-full', className)}
      containerClassName="rounded-full"
      {...props}
    />
  );
}

/**
 * BackgroundImage - Optimized background image
 */
export function BackgroundImage({
  src,
  alt = '',
  children,
  overlay = false,
  overlayColor = 'rgba(0,0,0,0.5)',
  className,
  ...props
}) {
  return (
    <div className={cn('relative', className)} {...props}>
      <OptimizedImage
        src={src}
        alt={alt}
        objectFit="cover"
        className="absolute inset-0 w-full h-full"
        containerClassName="absolute inset-0"
      />
      {overlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: overlayColor }}
          aria-hidden="true"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

import { memo } from 'react';

// Memoized image component for better performance
export const OptimizedImage = memo(({ src, alt, className, loading = 'lazy', ...props }) => {
  return (
    <img src={src} alt={alt} className={className} loading={loading} decoding="async" {...props} />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Lazy loading wrapper for components
export const LazySection = memo(({ children, className = '' }) => {
  return (
    <section
      className={`${className} will-change-auto`}
      style={{ containIntrinsicSize: '1px 500px' }}
    >
      {children}
    </section>
  );
});

LazySection.displayName = 'LazySection';

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.onload = function () {
    this.rel = 'stylesheet';
  };
  document.head.appendChild(fontLink);

  // Preload critical images
  const criticalImages = ['/logo192.png', '/favicon.ico'];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    document.head.appendChild(link);
  });
};

// Resource hints component
export const ResourceHints = memo(() => {
  return (
    <>
      {/* DNS prefetch for external resources */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />

      {/* Preconnect to critical third-party domains */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* Resource hints for better loading */}
      <meta name="theme-color" content="#2563eb" />
      <meta name="msapplication-TileColor" content="#2563eb" />
    </>
  );
});

ResourceHints.displayName = 'ResourceHints';

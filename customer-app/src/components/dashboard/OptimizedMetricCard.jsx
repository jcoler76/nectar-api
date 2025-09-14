import { memo, useCallback, useEffect, useRef } from 'react';

import performanceMonitor from '../../utils/performanceMonitor';

import MetricCard from './MetricCard';

// Memoized MetricCard with performance optimizations
const OptimizedMetricCard = memo(({ title, value, icon, ...props }) => {
  const cardRef = useRef(null);
  const animationRef = useRef(null);

  // Memoize the formatted value to prevent unnecessary re-renders
  const formattedValue = useCallback(() => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  // Optimize hover animations with RAF
  const handleMouseEnter = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.willChange = 'transform, box-shadow';
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.willChange = 'auto';
      }
    });
  }, []);

  // Monitor performance in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && cardRef.current) {
      performanceMonitor.monitorElementPerformance(cardRef.current, `MetricCard-${title}`);
    }
  }, [title]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="gpu-optimized"
    >
      <MetricCard title={title} value={formattedValue()} icon={icon} {...props} />
    </div>
  );
});

OptimizedMetricCard.displayName = 'OptimizedMetricCard';

// Only re-render if props actually changed
export default memo(OptimizedMetricCard, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.icon === nextProps.icon
  );
});

import { useEffect, useState } from 'react';

import { cn } from '../../lib/utils';

import ModernSidebar from './ModernSidebar';
import ModernTopBar from './ModernTopBar';

const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_EXPANDED_WIDTH = 288;
const TOPBAR_HEIGHT = 64;

const ModernLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior with improved mobile detection
  useEffect(() => {
    const lastIsSmall = { current: null };
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        const mobile = window.innerWidth < 768;
        const tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        const isSmall = mobile || tablet;
        setIsMobile(mobile);

        // Collapse on initial mount if small, or when transitioning from desktop -> small
        if (lastIsSmall.current === null) {
          if (isSmall) setSidebarCollapsed(true);
        } else if (isSmall && lastIsSmall.current === false) {
          setSidebarCollapsed(true);
        }
        lastIsSmall.current = isSmall;
      }
    };

    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar - Fixed positioning with proper z-index */}
      <ModernSidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      {/* Top Bar - Sticky positioning with proper spacing */}
      <ModernTopBar sidebarCollapsed={sidebarCollapsed} onSidebarToggle={handleSidebarToggle} />

      {/* Main Content Area - Responsive with proper spacing */}
      <main
        className={cn(
          'sidebar-transition gpu-accelerated',
          'min-h-screen flex flex-col',
          // Responsive margin adjustments
          isMobile ? 'ml-0' : ''
        )}
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          paddingTop: TOPBAR_HEIGHT,
        }}
        role="main"
        aria-label="Main content"
      >
        {/* Content Container with proper spacing and animations */}
        <div id="main-content" className="flex-1 p-6 space-y-6 animate-fade-in">
          <div className="max-w-full mx-auto">{children}</div>
        </div>
      </main>

      {/* Enhanced Mobile Overlay with smooth animations */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in backdrop-blur-sm"
          onClick={handleSidebarToggle}
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
};

export default ModernLayout;

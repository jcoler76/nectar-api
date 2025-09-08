import {
    Activity,
    BarChart3,
    Cable,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Code,
    Database,
    Gauge,
    GitBranch,
    Grid3X3,
    LayoutDashboard,
    Search,
    Settings,
    Shield,
    Timer,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionContext';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 288;

const ModernSidebar = ({ collapsed, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const permissions = usePermissions();
  const navRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  const toggleExpanded = itemId => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Organize menu items in logical groups for better UX
  const menuItems = [
    // Desired order
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
      permission: 'canViewDashboard',
      badge: null,
    },
    {
      title: 'Connections',
      url: '/connections',
      icon: Cable,
      permission: 'canManageServices',
      badge: null,
    },
    {
      title: 'Services',
      url: '/services',
      icon: Database,
      permission: 'canManageServices',
      badge: null,
    },
    { title: 'Roles', url: '/roles', icon: Shield, permission: 'canManageRoles', badge: null },
    {
      title: 'Applications',
      url: '/applications',
      icon: Grid3X3,
      permission: 'canManageApplications',
      badge: null,
    },
    ...(user?.isAdmin
      ? [
          {
            id: 'rate-limits',
            title: 'Rate Limits',
            icon: Timer,
            permission: null,
            badge: null,
            expandable: true,
            children: [
              {
                title: 'Configuration',
                url: '/rate-limits',
                icon: Timer,
                permission: null,
                badge: null,
              },
              {
                title: 'Monitor',
                url: '/rate-limits/monitor',
                icon: Gauge,
                permission: null,
                badge: null,
              },
              {
                title: 'Analytics',
                url: '/rate-limits/analytics',
                icon: TrendingUp,
                permission: null,
                badge: null,
              },
            ],
          },
        ]
      : []),
    ...(user?.isAdmin
      ? [
          {
            title: 'Developer Endpoints',
            url: '/endpoints',
            icon: Code,
            permission: null,
            badge: null,
          },
        ]
      : []),
    {
      title: 'API Usage Report',
      url: '/reports/api-usage',
      icon: BarChart3,
      permission: 'canViewDashboard',
      badge: null,
    },
    {
      title: 'Activity Logs',
      url: '/reports/activity-logs',
      icon: Activity,
      permission: 'canViewDashboard',
      badge: null,
    },
    {
      title: 'Workflows',
      url: '/workflows',
      icon: GitBranch,
      permission: 'canManageServices',
      badge: null,
    },
    {
      title: 'Workflow Executions',
      url: '/reports/workflow-executions',
      icon: BarChart3,
      permission: 'canViewDashboard',
      badge: null,
    },
    { title: 'Users', url: '/users', icon: Users, permission: 'canManageUsers', badge: null },
  ];

  const settingsItem = {
    title: user?.name || user?.email || 'Settings',
    url: permissions.isAdmin ? '/admin-settings' : '/user-settings',
    icon: Settings,
    permission: 'canAccessSettings',
  };

  // Auto-expand parent items when child routes are active
  useEffect(() => {
    const isRateLimitActive = location.pathname.startsWith('/rate-limits');
    if (isRateLimitActive && !expandedItems.has('rate-limits')) {
      setExpandedItems(prev => new Set([...prev, 'rate-limits']));
    }
  }, [location.pathname, expandedItems]);

  const filteredMenuItems = menuItems.filter(item => {
    const hasPermission = item.permission ? permissions[item.permission] : true;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.children &&
        item.children.some(child => child.title.toLowerCase().includes(searchQuery.toLowerCase())));
    return hasPermission && matchesSearch;
  });

  // Detect mobile and manage focus trap when sidebar is open on mobile
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    checkScreenSize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  useEffect(() => {
    if (!isMobile || collapsed) return;

    // Focus the sidebar container when opened on mobile
    const el = navRef.current;
    if (el) {
      el.focus({ preventScroll: true });
    }

    const handleKeyDown = e => {
      if (!navRef.current) return;
      if (e.key === 'Escape') {
        onToggle?.();
        e.preventDefault();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      const focusables = Array.from(navRef.current.querySelectorAll(focusableSelectors)).filter(
        node => node.offsetParent !== null
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Lock body scroll while sidebar is open on mobile
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [isMobile, collapsed, onToggle]);

  const NavigationItem = ({ item, isActive, isChild = false }) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.has(item.id);
    const hasActiveChild =
      item.children && item.children.some(child => location.pathname === child.url);
    const isParentActive = isActive || hasActiveChild;

    if (item.expandable) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium group relative',
              'micro-interaction click-feedback gpu-accelerated',
              'hover:bg-white/10 hover:text-white hover:shadow-soft',
              'focus:outline-none focus-visible:outline-none',
              isParentActive
                ? 'bg-white/20 text-white shadow-glow hover:opacity-90 pulse-on-hover'
                : 'text-white',
              collapsed && 'justify-center px-2'
            )}
            aria-label={`${item.title} menu`}
            aria-expanded={isExpanded}
            role="menuitem"
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-all duration-300 gpu-accelerated',
                isParentActive ? 'text-white' : 'text-white',
                'group-hover:scale-110 group-hover:rotate-3'
              )}
              aria-hidden="true"
            />

            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate transition-all duration-200 group-hover:translate-x-1">
                  {item.title}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                )}
              </>
            )}

            {/* Enhanced tooltip for collapsed state */}
            {collapsed && (
              <div
                className={cn(
                  'absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-large',
                  'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
                  'transition-all duration-200 ease-smooth pointer-events-none whitespace-nowrap z-50',
                  'border border-border/50 backdrop-blur-sm'
                )}
                role="tooltip"
                aria-hidden="true"
              >
                {item.title}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-t border-border/50 rotate-45" />
              </div>
            )}
          </button>

          {/* Children */}
          {!collapsed && isExpanded && item.children && (
            <div className="ml-4 mt-1 space-y-1 animate-slide-in-down">
              {item.children.map(child => (
                <NavigationItem
                  key={child.url}
                  item={child}
                  isActive={location.pathname === child.url}
                  isChild={true}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => navigate(item.url)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium group relative',
          'micro-interaction click-feedback gpu-accelerated',
          'hover:bg-white/10 hover:text-white hover:shadow-soft',
          'focus:outline-none focus-visible:outline-none',
          isActive
            ? 'bg-white/20 text-white shadow-glow hover:opacity-90 pulse-on-hover'
            : 'text-white',
          collapsed && 'justify-center px-2',
          isChild && 'ml-2 text-xs py-2'
        )}
        aria-label={item.title}
        aria-current={isActive ? 'page' : undefined}
        role="menuitem"
      >
        <Icon
          className={cn(
            'h-5 w-5 transition-all duration-300 gpu-accelerated',
            isActive ? 'text-white' : 'text-white',
            'group-hover:scale-110 group-hover:rotate-3',
            isChild && 'h-4 w-4'
          )}
          aria-hidden="true"
        />

        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate transition-all duration-200 group-hover:translate-x-1">
              {item.title}
            </span>
            {item.badge && (
              <Badge
                variant="secondary"
                className="ml-auto animate-bounce-subtle"
                aria-label={`${item.badge} notifications`}
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}

        {/* Enhanced tooltip for collapsed state */}
        {collapsed && (
          <div
            className={cn(
              'absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-large',
              'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
              'transition-all duration-200 ease-smooth pointer-events-none whitespace-nowrap z-50',
              'border border-border/50 backdrop-blur-sm'
            )}
            role="tooltip"
            aria-hidden="true"
          >
            {item.title}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-t border-border/50 rotate-45" />
          </div>
        )}
      </button>
    );
  };

  return (
    <nav
      id="main-navigation"
      ref={navRef}
      className={cn(
        'fixed left-0 top-0 h-full border-r border-blue-200 shadow-large z-40',
        'flex flex-col sidebar-transition gpu-accelerated',
        // Hide sidebar completely on mobile when collapsed, show as overlay when expanded
        'md:translate-x-0',
        collapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'
      )}
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        background: 'linear-gradient(135deg, #0c4a6e 0%, #38bdf8 100%)',
      }}
      role={isMobile && !collapsed ? 'dialog' : 'navigation'}
      aria-modal={isMobile && !collapsed ? 'true' : undefined}
      aria-label={isMobile && !collapsed ? 'Mobile navigation' : 'Main navigation'}
      tabIndex={isMobile && !collapsed ? -1 : undefined}
    >
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4 border-b border-blue-200">
        {!collapsed && (
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="w-8 h-8 rounded-sm bg-white/20 flex items-center justify-center shadow-glow hover-glow">
              <Database className="h-5 w-5 text-white transition-transform duration-300 hover:scale-110" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-white text-sm transition-colors duration-200">
                Nectar Studio
              </span>
              <span className="text-xs text-blue-100">Admin Dashboard</span>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-white/10 text-white micro-interaction click-feedback"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
        >
          {collapsed ? (
            <ChevronRight
              className="h-4 w-4 transition-transform duration-300 hover:translate-x-0.5"
              aria-hidden="true"
            />
          ) : (
            <ChevronLeft
              className="h-4 w-4 transition-transform duration-300 hover:-translate-x-0.5"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="p-4 border-b border-blue-200 animate-slide-in-right">
          <div className="relative group">
            <label htmlFor="navigation-search" className="sr-only">
              Search navigation items
            </label>
            <Search
              className={cn(
                'absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-all duration-300',
                searchQuery
                  ? 'text-white scale-110'
                  : 'text-blue-100 group-focus-within:text-white group-focus-within:scale-110'
              )}
              aria-hidden="true"
            />
            <Input
              id="navigation-search"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-white/10 text-white placeholder:text-blue-100 border-blue-200 focus:border-white focus-ring-enhanced transition-all duration-300 hover:bg-white/20"
              aria-describedby="search-help"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-100 hover:text-white transition-colors duration-200 micro-interaction"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
            <div id="search-help" className="sr-only">
              Type to filter navigation items by name
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav
        className="flex-1 overflow-y-auto p-4 space-y-1 sidebar-scroll"
        role="navigation"
        aria-label="Main navigation"
      >
        <ul role="menu" className={cn('space-y-1', !collapsed && 'stagger-fade-in')}>
          {filteredMenuItems.map((item, index) => (
            <li
              key={item.url || item.id}
              role="none"
              style={{ animationDelay: collapsed ? '0s' : `${(index + 1) * 0.05}s` }}
            >
              <NavigationItem item={item} isActive={item.url && location.pathname === item.url} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Settings/User Section */}
      <div className="p-4 border-t border-border">
        <NavigationItem item={settingsItem} isActive={location.pathname === settingsItem.url} />
      </div>
    </nav>
  );
};

export default ModernSidebar;

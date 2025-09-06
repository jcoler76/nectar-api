import {
  Bell,
  CheckCheck,
  ChevronRight,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';
import InstallPromptBanner from '../pwa/InstallPromptBanner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

const ModernTopBar = ({ sidebarCollapsed, onSidebarToggle }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const enablePwa = process.env.REACT_APP_ENABLE_PWA === 'true';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { customBreadcrumbs } = useBreadcrumbs();

  // Notification management
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    formatTime,
    getTypeIcon,
  } = useNotifications({ limit: 5 });

  // Handle responsive behavior
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

  // A2HS prompt capture (mobile install)
  useEffect(() => {
    if (!enablePwa) return undefined;
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [enablePwa]);

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Only add Home breadcrumb if we're not already on dashboard
    if (location.pathname !== '/dashboard') {
      breadcrumbs.push({ label: 'Home', path: '/dashboard' });
    }

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = customBreadcrumbs || generateBreadcrumbs();

  const sidebarWidth = sidebarCollapsed ? 72 : 288;

  return (
    <>
      <header
        className={cn(
          'fixed top-0 h-14 bg-card border-b border-border shadow-soft z-30 transition-all duration-300 ease-smooth',
          'flex items-center justify-between px-6'
        )}
        style={{
          left: isMobile ? 0 : sidebarWidth,
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
        }}
        role="banner"
        aria-label="Top navigation and user controls"
      >
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={!sidebarCollapsed}
          aria-controls="main-navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Breadcrumbs - Hidden on mobile to save space */}
        <nav className="hidden md:flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.path}-${index}`} className="flex items-center space-x-2">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <button
                  onClick={() => navigate(crumb.path)}
                  className={cn(
                    'hover:text-primary transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-1 py-0.5',
                    index === breadcrumbs.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                >
                  {crumb.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Mobile Title - Show current page title on mobile */}
        <div className="md:hidden flex-1 ml-4">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Global Search - Desktop */}
          <div className="hidden md:block relative">
            <label htmlFor="global-search" className="sr-only">
              Search across the application
            </label>
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="global-search"
              placeholder="Search..."
              className="pl-8 w-64 h-9 bg-background/50"
              aria-describedby="search-help"
            />
            <div id="search-help" className="sr-only">
              Search for services, users, or other content
            </div>
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* A2HS Install Button (mobile) */}
          {enablePwa && isMobile && deferredPrompt && (
            <Button
              variant="ghost"
              className="md:hidden h-9 px-3"
              onClick={async () => {
                try {
                  await deferredPrompt.prompt();
                  const choice = await deferredPrompt.userChoice;
                  // eslint-disable-next-line no-console
                  console.log('A2HS choice', choice.outcome);
                } catch (_) {
                  /* ignore */
                }
                setDeferredPrompt(null);
              }}
              aria-label="Install app"
            >
              Install
            </Button>
          )}

          {/* Endpoint Wizard - Admin Only */}
          {user?.isAdmin && (
            <Button
              onClick={() => navigate('/services/wizard')}
              className="hidden md:flex bg-ocean-500 text-white hover:bg-ocean-600 border-ocean-500 h-9 px-3 space-x-2"
              aria-label="Create new endpoint"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">Endpoint Wizard</span>
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 transition-all duration-200"
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4 animate-fade-in" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 animate-fade-in" aria-hidden="true" />
            )}
            <span className="sr-only">
              {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            </span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <Badge
                    variant={unreadCount > 9 ? 'destructive' : 'default'}
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80"
              role="menu"
              aria-label="Notifications"
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      {unreadCount > 0
                        ? `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`
                        : 'All caught up!'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={markAllAsRead}>
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Mark all as read
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={clearAllNotifications}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear all
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto" role="group" aria-label="Notification list">
                {notificationsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.map(notification => {
                      const TypeIcon =
                        getTypeIcon(notification.type) === 'Settings'
                          ? Settings
                          : getTypeIcon(notification.type) === 'Zap'
                            ? Zap
                            : getTypeIcon(notification.type) === 'Shield'
                              ? Shield
                              : getTypeIcon(notification.type) === 'MessageCircle'
                                ? MessageCircle
                                : Bell;

                      const priorityColor =
                        notification.priority === 'high'
                          ? 'bg-red-500'
                          : notification.priority === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-green-500';

                      return (
                        <div key={notification._id} className="relative group">
                          <button
                            className={cn(
                              'w-full p-3 hover:bg-accent rounded-md cursor-pointer text-left transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              !notification.isRead && 'bg-accent/50'
                            )}
                            onClick={() => markAsRead(notification._id)}
                            role="menuitem"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex items-center space-x-1 mt-1">
                                <TypeIcon className="h-3 w-3 text-muted-foreground" />
                                {!notification.isRead && (
                                  <div
                                    className={cn('w-2 h-2 rounded-full', priorityColor)}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    'text-sm truncate',
                                    !notification.isRead ? 'font-medium' : 'font-normal'
                                  )}
                                >
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Individual notification actions */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.isRead && (
                                  <DropdownMenuItem onClick={() => markAsRead(notification._id)}>
                                    <CheckCheck className="h-4 w-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => deleteNotification(notification._id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-2 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm"
                    role="menuitem"
                    onClick={() => navigate('/notifications')}
                  >
                    View all notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-3 space-x-2 focus-visible:ring-0 focus-visible:outline-none"
                aria-label={`User menu for ${user?.name || user?.email?.split('@')[0] || 'User'}`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" role="menu" aria-label="User menu">
              <div className="p-2" role="group" aria-label="User information">
                <div className="flex items-center space-x-2 p-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/user-settings')} role="menuitem">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              {user?.isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin-settings')} role="menuitem">
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Admin Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive" role="menuitem">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Search Modal */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="sm:max-w-lg w-[95vw] p-4">
            <DialogHeader>
              <DialogTitle>Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label htmlFor="mobile-search" className="sr-only">
                Search across the application
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="mobile-search"
                  placeholder="Search..."
                  autoFocus
                  className="pl-8 h-11"
                  aria-describedby="mobile-search-help"
                />
              </div>
              <div id="mobile-search-help" className="text-xs text-muted-foreground">
                Search services, users, endpoints, and docs
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>
      {enablePwa && isMobile && deferredPrompt && (
        <InstallPromptBanner
          deferredPrompt={deferredPrompt}
          onInstalled={() => setDeferredPrompt(null)}
        />
      )}
    </>
  );
};

export default ModernTopBar;

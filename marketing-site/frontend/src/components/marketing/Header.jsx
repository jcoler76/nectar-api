import React, { useEffect, useRef, useState } from 'react';
import { Workflow, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);
  const firstItemRef = useRef(null);
  const toggleRef = useRef(null);
  const handleTryNow = () => navigate('/pricing');

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    const original = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Handle Escape to close and Tab focus trapping inside menu
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = menuRef.current?.querySelectorAll(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!nodes || nodes.length === 0) return;
        const focusables = Array.from(nodes);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // Focus first item on open
    setTimeout(() => firstItemRef.current?.focus(), 0);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <button
            onClick={() => { setOpen(false); navigate('/'); }}
            className="flex items-center space-x-2 bg-transparent border-none cursor-pointer"
            aria-label="Go to Home"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">NectarStudio</span>
              <span className="text-xl font-bold text-blue-600">.ai</span>
            </div>
          </button>
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate('/security')}
              className="text-gray-600 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              Security
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="text-gray-600 hover:text-gray-900 transition-colors bg-transparent border-none cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => (window.location.href = `${process.env.REACT_APP_CUSTOMER_APP_URL}/login`)}
              className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleTryNow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Try Now
            </button>
          </div>
          <div className="md:hidden">
            <button
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-haspopup="menu"
              ref={toggleRef}
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              {open ? (
                <>
                  <span className="sr-only">Close menu</span>
                  <X className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span className="sr-only">Open menu</span>
                  <Menu className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
        {open && (
          <>
            <div
              className="fixed inset-0 bg-black/20 md:hidden"
              style={{ zIndex: 40 }}
              onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
            />
            <div className="fixed left-0 right-0 top-16 md:hidden transition-all duration-200 ease-out" style={{ zIndex: 50 }}>
              <div className="px-4">
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Mobile navigation"
                  className="flex flex-col gap-2 bg-white/95 backdrop-blur rounded-xl border border-gray-200 p-4 shadow-xl transition transform duration-200 ease-out translate-y-0 opacity-100"
                >
                  <button
                    ref={firstItemRef}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate('/'); }}
                    className={`text-left px-2 py-2 rounded-lg hover:bg-gray-50 ${location.pathname === '/' ? 'font-semibold text-gray-900 bg-gray-50' : ''}`}
                  >
                    Home
                  </button>
                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate('/pricing'); }}
                    className={`text-left px-2 py-2 rounded-lg hover:bg-gray-50 ${location.pathname.startsWith('/pricing') ? 'font-semibold text-gray-900 bg-gray-50' : ''}`}
                  >
                    Pricing
                  </button>
                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate('/security'); }}
                    className={`text-left px-2 py-2 rounded-lg hover:bg-gray-50 ${location.pathname.startsWith('/security') ? 'font-semibold text-gray-900 bg-gray-50' : ''}`}
                  >
                    Security
                  </button>
                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate('/contact'); }}
                    className={`text-left px-2 py-2 rounded-lg hover:bg-gray-50 ${location.pathname.startsWith('/contact') ? 'font-semibold text-gray-900 bg-gray-50' : ''}`}
                  >
                    Contact
                  </button>
                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); window.location.href = `${process.env.REACT_APP_CUSTOMER_APP_URL}/login`; }}
                    className="text-left px-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    Sign In
                  </button>
                  <button
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { setOpen(false); navigate('/pricing'); }}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Try Now
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

Header.displayName = 'Header';

export default Header;

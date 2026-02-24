import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Clock3, Image, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const AppShell = ({
  children,
  currentView,
  onViewChange,
  isAdmin = false
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const views = [
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: Clock3 },
    { id: 'gallery', label: 'Gallery', icon: Image }
  ];

  return (
    <div className="min-h-screen bg-base flex">
      {/* Sidebar */}
      <motion.aside
        animate={prefersReducedMotion ? {} : { width: sidebarCollapsed ? '64px' : '256px' }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' }}
        style={prefersReducedMotion ? { width: sidebarCollapsed ? '64px' : '256px' } : {}}
        className="bg-elevation-1 border-r border-stroke-outer flex flex-col relative"
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 z-10 size-6 rounded-full bg-elevation-2 border border-stroke-outer flex items-center justify-center hover:bg-elevation-3 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3 text-text-muted" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-text-muted" />
          )}
        </button>

        {/* View Switcher */}
        <nav className="flex-1 p-4 pt-6">{/* Added extra top padding since we removed the header */}
          <div className="space-y-1">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = currentView === view.id;

              return (
                <button
                  key={view.id}
                  onClick={() => onViewChange(view.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-all',
                    'hover:bg-white/5',
                    isActive && 'bg-white/10 text-accent',
                    sidebarCollapsed && 'justify-center'
                  )}
                  title={sidebarCollapsed ? view.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {view.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && !sidebarCollapsed && (
                    <motion.div
                      layoutId="activeView"
                      className="ml-auto w-1 h-4 bg-accent rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Admin Link */}
        {isAdmin && (
          <div className="p-4 border-t border-stroke-outer">
            <button
              onClick={() => window.location.href = '/roadmap/admin'}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-white/5 text-text-muted hover:text-text-hi transition-all',
                sidebarCollapsed && 'justify-center'
              )}
              title={sidebarCollapsed ? 'Admin Panel' : undefined}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Admin Panel
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
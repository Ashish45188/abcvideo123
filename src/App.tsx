import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './pages/AdminDashboard';
import { VisitorView } from './pages/VisitorView';
import { ExternalLink, Shield, Monitor, Smartphone } from 'lucide-react';

export default function App() {
  const [visitorShareId, setVisitorShareId] = useState<string | null>(null);

  // Check URL parameters and path on load
  useEffect(() => {
    const parseUrl = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const watchParam = searchParams.get('watch');
      if (watchParam) {
        setVisitorShareId(watchParam);
        return;
      }

      const hash = window.location.hash;
      if (hash.startsWith('#watch/')) {
        const id = hash.replace('#watch/', '');
        if (id) {
          setVisitorShareId(id);
          return;
        }
      }

      const pathname = window.location.pathname;
      if (pathname.startsWith('/watch/')) {
        const id = pathname.replace('/watch/', '');
        if (id) {
          setVisitorShareId(id);
          return;
        }
      }

      // If no watch parameter in URL, stay on admin or default
    };

    parseUrl();

    window.addEventListener('popstate', parseUrl);
    window.addEventListener('hashchange', parseUrl);

    return () => {
      window.removeEventListener('popstate', parseUrl);
      window.removeEventListener('hashchange', parseUrl);
    };
  }, []);

  const handleOpenVisitorView = (shareId: string) => {
    setVisitorShareId(shareId);
    window.history.pushState({}, '', `?watch=${shareId}`);
  };

  const handleNavigateToAdmin = () => {
    setVisitorShareId(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {visitorShareId ? (
        <VisitorView
          shareId={visitorShareId}
          onNavigateToAdmin={handleNavigateToAdmin}
        />
      ) : (
        <AdminDashboard onOpenVisitorView={handleOpenVisitorView} />
      )}
    </div>
  );
}

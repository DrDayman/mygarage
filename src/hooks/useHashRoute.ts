import { useCallback, useEffect, useState } from 'react';

export type Route = { view: 'dashboard' } | { view: 'vehicle'; vehicleId: string };

export function parseHash(hash: string): Route {
  const match = /^#\/vehicles\/([^/]+)$/.exec(hash);
  return match ? { view: 'vehicle', vehicleId: decodeURIComponent(match[1]) } : { view: 'dashboard' };
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((next: Route, { replace = false } = {}) => {
    const hash = next.view === 'vehicle' ? `#/vehicles/${encodeURIComponent(next.vehicleId)}` : '#/';
    setRoute(next);
    window.scrollTo(0, 0);
    try {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    } catch {
    }
  }, []);

  return { route, navigate };
}

import { useCallback, useEffect, useState } from 'react';

export type Route = { view: 'dashboard' } | { view: 'vehicle'; vehicleId: string };

export function parseHash(hash: string): Route {
  const match = /^#\/vehicles\/([^/]+)$/.exec(hash);
  return match ? { view: 'vehicle', vehicleId: decodeURIComponent(match[1]) } : { view: 'dashboard' };
}

/**
 * Tiny hash router: deep links (#/vehicles/v1) survive a refresh and the browser's
 * back button works, without pulling in a routing library for two screens.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    // popstate covers back/forward after pushState; hashchange covers typed or linked URLs.
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((next: Route, { replace = false } = {}) => {
    const hash = next.view === 'vehicle' ? `#/vehicles/${encodeURIComponent(next.vehicleId)}` : '#/';
    // Update the screen first, then the URL: if the URL can't change (e.g. inside a
    // sandboxed iframe) navigation still works, it just isn't bookmarkable.
    setRoute(next);
    window.scrollTo(0, 0);
    try {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    } catch {
      // ignore
    }
  }, []);

  return { route, navigate };
}

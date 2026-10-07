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
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route, { replace = false } = {}) => {
    const hash = next.view === 'vehicle' ? `#/vehicles/${encodeURIComponent(next.vehicleId)}` : '#/';
    if (replace) {
      window.history.replaceState(null, '', hash);
      setRoute(next);
    } else {
      window.location.hash = hash;
    }
  }, []);

  return { route, navigate };
}

import { useEffect, useState } from 'react';

// Minimal hash router: works on static hosting (e.g. GitHub Pages) with no server config.
export type Route =
  | { name: 'today' }
  | { name: 'log-meal' }
  | { name: 'log-ketone' }
  | { name: 'ketones' }
  | { name: 'recipes' }
  | { name: 'recipe'; id: string }
  | { name: 'progress' }
  | { name: 'summary' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const [path, param] = hash.replace(/^#\/?/, '').split('/');
  switch (path) {
    case 'log-meal':
    case 'log-ketone':
    case 'ketones':
    case 'recipes':
    case 'progress':
    case 'summary':
    case 'settings':
      return { name: path };
    case 'recipe':
      return param ? { name: 'recipe', id: decodeURIComponent(param) } : { name: 'recipes' };
    default:
      return { name: 'today' };
  }
}

// The claude.ai artifact build (`npm run build:artifact`) runs inside a sandboxed frame that may
// not pass hash changes through, so it keeps routes in memory and intercepts "#/..." link clicks.
const MEMORY = import.meta.env.VITE_ARTIFACT === '1';
const stack: Route[] = [MEMORY ? { name: 'today' } : parseHash(window.location.hash)];
const listeners = new Set<() => void>();

function toHash(path: string) {
  return path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
}

function emit() {
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => stack[stack.length - 1]);
  useEffect(() => {
    if (MEMORY) {
      const onRoute = () => setRoute(stack[stack.length - 1]);
      const onClick = (e: MouseEvent) => {
        const a = (e.target as Element | null)?.closest?.('a');
        const href = a?.getAttribute('href');
        if (!href || !href.startsWith('#/') || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        navigate(href);
      };
      listeners.add(onRoute);
      document.addEventListener('click', onClick);
      return () => {
        listeners.delete(onRoute);
        document.removeEventListener('click', onClick);
      };
    }
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  if (!MEMORY) {
    window.location.hash = toHash(path);
    return;
  }
  stack.push(parseHash(toHash(path)));
  if (stack.length > 50) stack.splice(0, stack.length - 50);
  emit();
}

export function goBack(fallback = 'today') {
  if (MEMORY) {
    if (stack.length > 1) {
      stack.pop();
      emit();
    } else navigate(fallback);
    return;
  }
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}

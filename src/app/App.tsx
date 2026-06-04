import { useEffect, useMemo, useState } from 'react';

import DownloadPage from '../features/download/DownloadPage';
import SupportPage from '../features/support/SupportPage';
import TutorialPage from '../features/tutorial/TutorialPage';
import { getPageTitle } from '../content/site-copy';
import { parseLocale, type Locale } from '../shared/lib/metrics';
import { createRuntimeMetricsClient } from '../shared/lib/metrics-client';
import { HeroOverviewPage } from './route-pages';
import { getCanonicalPath, isSpaRoutePath, resolveSpaRoute } from './router';
import { NotFoundScreen } from './screens';

type BrowserLocation = {
  pathname: string;
  search: string;
};

function readBrowserLocation(): BrowserLocation {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

function readLocale(search: string): Locale {
  return parseLocale(new URLSearchParams(search).get('lang'));
}

export default function App() {
  const client = useMemo(() => createRuntimeMetricsClient(), []);
  const [location, setLocation] = useState<BrowserLocation>(() => readBrowserLocation());
  const route = resolveSpaRoute(location.pathname);
  const locale = readLocale(location.search);

  useEffect(() => {
    document.title = getPageTitle(route.page, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [route.page, locale]);

  useEffect(() => {
    const canonical = getCanonicalPath(location.pathname);
    if (canonical && canonical !== location.pathname) {
      window.history.replaceState({}, '', `${canonical}${location.search}`);
      setLocation(readBrowserLocation());
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handlePopState() {
      setLocation(readBrowserLocation());
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute('download')) {
        return;
      }

      const nextUrl = new URL(target.href);
      if (nextUrl.origin !== window.location.origin || !isSpaRoutePath(nextUrl.pathname)) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, '', nextUrl);
      setLocation(readBrowserLocation());
    }

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (route.page === 'heroes') {
    return <HeroOverviewPage client={client} locale={locale} search={location.search} />;
  }

  if (route.page === 'tutorial') {
    return <TutorialPage locale={locale} />;
  }

  if (route.page === 'download') {
    return <DownloadPage locale={locale} />;
  }

  if (route.page === 'download-preview') {
    return <DownloadPage locale={locale} variant="preview" />;
  }

  if (route.page === 'support') {
    return <SupportPage locale={locale} />;
  }

  return <NotFoundScreen locale={locale} />;
}

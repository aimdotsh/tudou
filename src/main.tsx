import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PrivacyModeProvider } from '@/context/PrivacyModeContext';
import Index from './pages';
import NotFound from './pages/404';
import ReactGA from 'react-ga4';
import {
  GOOGLE_ANALYTICS_TRACKING_ID,
  USE_GOOGLE_ANALYTICS,
} from './utils/const';
import '@/styles/index.css';
import { withOptionalGAPageTracking } from './utils/trackRoute';
import TotalPage from "@/pages/total";
import SummaryPage from "@/pages/summary";
import Daily from './pages/daily';
import DailyD from './pages/daily-d';
import Luck from './pages/luck';
if (USE_GOOGLE_ANALYTICS) {
  ReactGA.initialize(GOOGLE_ANALYTICS_TRACKING_ID);
}

const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: withOptionalGAPageTracking(<Index />),
    },
    {
      path: 'total',
      element: withOptionalGAPageTracking(<TotalPage />),
    },
    {
      path: 'recent',
      element: withOptionalGAPageTracking(<Daily />),
    },
    {
      path: 'daily-d',
      element: withOptionalGAPageTracking(<DailyD />),
    },
    {
      path: 'summary',
      element: withOptionalGAPageTracking(<SummaryPage />),
    },
    {
      path: 'luck',
      element: withOptionalGAPageTracking(<Luck />),
    },
    {
      path: '*',
      element: withOptionalGAPageTracking(<Daily />),
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <PrivacyModeProvider>
        <RouterProvider router={routes} />
      </PrivacyModeProvider>
    </HelmetProvider>
  </React.StrictMode>
);

'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import Nav from './components/Nav';
import SalesDashboard from './sections/SalesDashboard';
import SalesDaily from './sections/SalesDaily';
import SalesTracker from './sections/SalesTracker';
import SalesReps from './sections/SalesReps';
import SalesLog from './sections/SalesLog';
import AdsDashboard from './sections/AdsDashboard';
import AdsDaily from './sections/AdsDaily';
import AdsTracker from './sections/AdsTracker';
import Sources from './sections/Sources';
import { fetchDashboard } from '@/lib/api';

const ADS_METRIC_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'daily',     label: 'Daily' },
  { key: 'weekly',    label: 'Weekly' },
  { key: 'monthly',   label: 'Monthly' }
];

const NAV_CONFIG = {
  'Sales by Source': [
    { key: 'monthly',   label: 'Monthly' },
    { key: 'all-time',  label: 'All-Time' }
  ],
  Ads: [
    { key: 'all',      label: 'All',      subTabs: ADS_METRIC_TABS },
    { key: 'google',   label: 'Google',   subTabs: ADS_METRIC_TABS },
    { key: 'facebook', label: 'Facebook', subTabs: ADS_METRIC_TABS },
    { key: 'tiktok',   label: 'TikTok',   subTabs: ADS_METRIC_TABS }
  ],
  'Sales Team': [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'daily',     label: 'Daily' },
    { key: 'weekly',    label: 'Weekly' },
    { key: 'monthly',   label: 'Monthly' },
    { key: 'reps',      label: 'Reps' },
    { key: 'log',       label: 'Sales Log' }
  ]
};

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [section, setSection] = useState('Sales Team');
  const [tab, setTab] = useState('dashboard');
  const [subTab, setSubTab] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const json = await fetchDashboard();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <div>
      <div className="sticky top-0 z-20 shadow-md">
        <Header asOf={data?.asOf} onRefresh={onRefresh} refreshing={refreshing} />
        <Nav section={section} setSection={setSection} tab={tab} setTab={setTab} subTab={subTab} setSubTab={setSubTab} config={NAV_CONFIG} />
      </div>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {loading && (
          <div className="text-center py-10">
            <svg className="spinner mx-auto h-8 w-8 text-olive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M22 12a10 10 0 0 1-10 10" />
            </svg>
            <p className="mt-3 text-sm opacity-70">Fetching latest numbers…</p>
          </div>
        )}

        {error && !loading && (
          <p className="text-red-700 font-medium py-10 text-center">⚠️ Failed to load: {error}</p>
        )}

        {data && !loading && !error && renderView({ section, tab, subTab, data })}
      </main>

      <footer className="text-center text-xs opacity-50 py-4">
        LaWayra · live data from Google Sheets
      </footer>
    </div>
  );
}

function renderView({ section, tab, subTab, data }) {
  // SALES BY SOURCE
  if (section === 'Sales by Source') {
    return <Sources data={data.sources?.monthly} mode={tab} />;
  }
  // ADS — section "Ads", tab = platform (all/google/facebook/tiktok), subTab = metric view
  if (section === 'Ads') {
    const platformLabels = {
      all:      'All Ads',
      google:   'Google Ads',
      facebook: 'Facebook Ads',
      tiktok:   'TikTok Ads'
    };
    const platformLabel = platformLabels[tab] || 'Ads';
    // Google falls back to legacy ads.{dashboard,daily,weekly,monthly} if the
    // new ads.google slot isn't present yet (Apps Script not redeployed).
    let platformData = data.ads?.[tab];
    if (!platformData && tab === 'google' && data.ads) {
      platformData = {
        dashboard: data.ads.dashboard,
        daily:     data.ads.daily,
        weekly:    data.ads.weekly,
        monthly:   data.ads.monthly
      };
    }
    if (!platformData) {
      return <p className="p-4 text-sm opacity-60">No data for {platformLabel} yet.</p>;
    }
    const metric = subTab || 'dashboard';
    if (metric === 'dashboard') return <AdsDashboard data={platformData.dashboard} title={`${platformLabel} — Dashboard`} />;
    if (metric === 'daily')     return <AdsDaily     data={platformData.daily}     title={`${platformLabel} — Daily`} />;
    if (metric === 'weekly')    return <AdsTracker   title={`${platformLabel} — Weekly Tracker`}  labelHeader="Week"  data={platformData.weekly} />;
    if (metric === 'monthly')   return <AdsTracker   title={`${platformLabel} — Monthly Tracker`} labelHeader="Month" data={platformData.monthly} isMonth />;
  }
  // SALES TEAM
  if (section === 'Sales Team') {
    if (tab === 'dashboard') return <SalesDashboard data={data.sales?.dashboard} />;
    if (tab === 'daily')     return <SalesDaily data={data.sales?.daily} />;
    if (tab === 'weekly')    return <SalesTracker title="Weekly Tracker"  labelHeader="Week"  data={data.sales?.weekly} />;
    if (tab === 'monthly')   return <SalesTracker title="Monthly Tracker" labelHeader="Month" data={data.sales?.monthly} isMonth />;
    if (tab === 'reps')      return <SalesReps data={data.sales?.reps} />;
    if (tab === 'log')       return <SalesLog data={data.sales?.log} />;
  }
  return null;
}

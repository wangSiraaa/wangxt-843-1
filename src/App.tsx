import { useState, useEffect } from 'react';
import { Bus, RotateCcw, Play } from 'lucide-react';
import {
  RouteFilter,
  RegistrationForm,
  WaitlistQueue,
  ChangeRecords,
  DriverCheckIn,
  ExportRoster,
} from './components';
import { useShuttleStore } from './store/useShuttleStore';
import { runSmokeTest } from './smoke/smokeTest';
import type { AppState } from './types';

type TabType = 'registration' | 'waitlist' | 'change' | 'checkin' | 'export';

const getDefaultTabForViewMode = (viewMode: AppState['viewMode']): TabType => {
  if (viewMode === 'driver') return 'checkin';
  return 'registration';
};

function App() {
  const { viewMode, resetStore, selectedRouteId, setSelectedDate } = useShuttleStore();
  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTabForViewMode(viewMode));
  const [smokeResult, setSmokeResult] = useState<string | null>(null);
  const [showSmoke, setShowSmoke] = useState(false);

  useEffect(() => {
    const defaultTab = getDefaultTabForViewMode(viewMode);
    setActiveTab(defaultTab);
    if (viewMode === 'driver') {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [viewMode, setSelectedDate]);

  const handleRunSmoke = () => {
    resetStore();
    const result = runSmokeTest();
    setSmokeResult(result);
    setShowSmoke(true);
  };

  const employeeTabs: { id: TabType; label: string }[] = [
    { id: 'registration', label: '报名' },
    { id: 'change', label: '改签记录' },
  ];

  const adminTabs: { id: TabType; label: string }[] = [
    { id: 'registration', label: '报名管理' },
    { id: 'waitlist', label: '候补队列' },
    { id: 'change', label: '改签记录' },
    { id: 'export', label: '导出名单' },
  ];

  const driverTabs: { id: TabType; label: string }[] = [
    { id: 'checkin', label: '签到核对' },
    { id: 'export', label: '导出名单' },
  ];

  const tabs = viewMode === 'employee' ? employeeTabs : viewMode === 'admin' ? adminTabs : driverTabs;

  const renderContent = () => {
    switch (activeTab) {
      case 'registration':
        return <RegistrationForm />;
      case 'waitlist':
        return <WaitlistQueue />;
      case 'change':
        return <ChangeRecords />;
      case 'checkin':
        return <DriverCheckIn />;
      case 'export':
        return <ExportRoster />;
      default:
        return <RegistrationForm />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Bus className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">企业班车乘车名单系统</h1>
                <p className="text-sm text-gray-500">员工报名 · 候补管理 · 司机签到 · 数据导出</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRunSmoke}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
              >
                <Play size={16} />
                运行 Smoke 测试
              </button>
              <button
                onClick={resetStore}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <RotateCcw size={16} />
                重置数据
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showSmoke && smokeResult && (
          <div className="mb-6 bg-gray-900 text-gray-100 rounded-xl p-6 font-mono text-sm overflow-x-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-green-400 font-semibold">Smoke 测试结果</span>
              <button
                onClick={() => setShowSmoke(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{smokeResult}</pre>
          </div>
        )}

        <div className="mb-6">
          <RouteFilter />
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderContent()}</div>
          <div className="space-y-6">
            {selectedRouteId && viewMode !== 'driver' && <WaitlistQueue />}
            {activeTab !== 'change' && viewMode !== 'driver' && (
              <div className="lg:hidden">
                <ChangeRecords />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          企业班车管理系统 © {new Date().getFullYear()} · 支持员工报名、候补队列、司机签到、名单导出
        </div>
      </footer>
    </div>
  );
}

export default App;

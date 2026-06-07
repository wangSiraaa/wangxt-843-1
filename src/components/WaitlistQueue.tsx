import React from 'react';
import { Clock, UserPlus, ToggleLeft, ToggleRight, ArrowUpCircle } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';

export const WaitlistQueue: React.FC = () => {
  const {
    selectedRouteId,
    selectedDate,
    viewMode,
    routes,
    getWaitlistForStop,
    getEmployeeById,
    toggleWaitlistEnabled,
    promoteFromWaitlist,
    getStopCapacity,
  } = useShuttleStore();

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <Clock size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请先选择一条线路</p>
        </div>
      </div>
    );
  }

  const sortedStops = [...selectedRoute.stops].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-yellow-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">候补队列管理</h2>
        {viewMode === 'admin' && (
          <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            管理员模式
          </span>
        )}
      </div>

      <div className="space-y-6">
        {sortedStops.map((stop) => {
          const waitlist = getWaitlistForStop(selectedRoute.id, stop.id, selectedDate);
          const capacity = getStopCapacity(selectedRoute.id, stop.id);

          return (
            <div key={stop.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">
                    {stop.order}. {stop.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    容量: {capacity.total} · 已用: {capacity.used} · 剩余:{' '}
                    <span className={capacity.remaining > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {capacity.remaining}
                    </span>
                  </span>
                  {waitlist.length > 0 && (
                    <span className="text-sm text-yellow-600 font-medium">
                      候补: {waitlist.length} 人
                    </span>
                  )}
                </div>

                {viewMode === 'admin' && (
                  <button
                    onClick={() => toggleWaitlistEnabled(selectedRoute.id, stop.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      stop.waitlistEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {stop.waitlistEnabled ? (
                      <>
                        <ToggleRight size={18} />
                        候补已开启
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={18} />
                        候补已关闭
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4">
                {waitlist.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无候补人员</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waitlist.map((entry, index) => {
                      const employee = getEmployeeById(entry.employeeId);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-yellow-200 text-yellow-800 rounded-full font-bold text-sm">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium text-gray-800">{employee?.name || '未知'}</div>
                              <div className="text-xs text-gray-500">
                                {employee?.department} · {employee?.employeeNo}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {new Date(entry.createdAt).toLocaleString('zh-CN')}
                            </span>
                            {viewMode === 'admin' && capacity.remaining > 0 && (
                              <button
                                onClick={() => {
                                  const result = promoteFromWaitlist(entry.id);
                                  alert(result.message);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                              >
                                <ArrowUpCircle size={16} />
                                转正
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

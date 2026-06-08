import React from 'react';
import { UserCheck, MapPin, CheckCircle2, Circle, Bus, Clock, AlertTriangle } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';
import { getToday } from '../data/mockData';

export const DriverCheckIn: React.FC = () => {
  const {
    selectedRouteId,
    selectedDate,
    routes,
    getDriverRoster,
    getEmployeeById,
    checkInEmployee,
    viewMode,
    setSelectedDate,
  } = useShuttleStore();

  const today = getToday();
  const isToday = selectedDate === today;

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const effectiveDate = today;

  if (viewMode !== 'driver') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请切换到"司机"视图模式</p>
        </div>
      </div>
    );
  }

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <Bus size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请先选择您驾驶的线路</p>
        </div>
      </div>
    );
  }

  const driverRoster = getDriverRoster(selectedRoute.id, effectiveDate);
  const totalPassengers = driverRoster.reduce((sum, r) => sum + r.registrations.length, 0);
  const checkedInCount = driverRoster.reduce(
    (sum, r) => sum + r.registrations.filter((reg) => reg.status === 'checked-in').length,
    0
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {!isToday && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">司机只能查看当天的乘车名单</p>
            <p className="text-xs text-amber-600">已自动切换到今天 ({today}) 的数据</p>
          </div>
          <button
            onClick={() => setSelectedDate(today)}
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 transition-colors"
          >
            切换到今天
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserCheck className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">司机签到核对</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{totalPassengers}</div>
            <div className="text-xs text-gray-500">总乘车人数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
            <div className="text-xs text-gray-500">已签到</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{totalPassengers - checkedInCount}</div>
            <div className="text-xs text-gray-500">未签到</div>
          </div>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-semibold text-blue-800">{selectedRoute.name}</div>
            <div className="text-sm text-blue-600 flex items-center gap-2">
              <Clock size={14} />
              {selectedRoute.departureTime} {selectedRoute.direction === 'morning' ? '早班' : '晚班'}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-600">司机: {selectedRoute.driverName}</div>
            <div className="text-sm text-gray-600">车牌: {selectedRoute.busNo}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {driverRoster.map(({ stop, registrations }) => (
          <div key={stop.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-500" />
                <span className="font-semibold text-gray-800">
                  {stop.order}. {stop.name}
                </span>
                <span className="text-sm text-gray-500">
                  ({registrations.length} 人)
                </span>
              </div>
              <span className="text-sm text-gray-500">{effectiveDate}</span>
            </div>

            <div className="p-4">
              {registrations.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">该站点暂无乘车人员</div>
              ) : (
                <div className="space-y-2">
                  {registrations.map((reg) => {
                    const employee = getEmployeeById(reg.employeeId);
                    const isCheckedIn = reg.status === 'checked-in';

                    return (
                      <div
                        key={reg.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isCheckedIn
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (!isCheckedIn) {
                                const result = checkInEmployee(reg.id, selectedRoute.driverName);
                                alert(result.message);
                              }
                            }}
                            disabled={isCheckedIn}
                            className={`p-1 rounded-full transition-colors ${
                              isCheckedIn
                                ? 'text-green-500 cursor-default'
                                : 'text-gray-300 hover:text-blue-500 cursor-pointer'
                            }`}
                          >
                            {isCheckedIn ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </button>
                          <div>
                            <div className={`font-medium ${isCheckedIn ? 'text-green-800' : 'text-gray-800'}`}>
                              {employee?.name || '未知'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee?.department} · {employee?.employeeNo} · {employee?.phone}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {isCheckedIn ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                              <CheckCircle2 size={12} />
                              已签到
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">点击左侧圆圈签到</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

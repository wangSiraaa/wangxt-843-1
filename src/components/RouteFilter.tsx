import React from 'react';
import { Bus, Calendar, Users, Shield, UserCheck } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';
import type { ViewMode } from '../types';

export const RouteFilter: React.FC = () => {
  const {
    routes,
    selectedRouteId,
    selectedDate,
    viewMode,
    setSelectedRoute,
    setSelectedDate,
    setViewMode,
    currentEmployeeId,
    setCurrentEmployee,
    employees,
  } = useShuttleStore();

  const viewModeOptions: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'employee', label: '员工', icon: <Users size={16} /> },
    { value: 'admin', label: '管理员', icon: <Shield size={16} /> },
    { value: 'driver', label: '司机', icon: <UserCheck size={16} /> },
  ];

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Bus className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">线路筛选</h2>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">视图模式:</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {viewModeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'employee' && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">当前员工:</label>
            <select
              value={currentEmployeeId || ''}
              onChange={(e) => setCurrentEmployee(e.target.value || null)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择员工</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.department}
                </option>
              ))}
            </select>
            {currentEmployee && (
              <span className="text-sm text-gray-500">
                工号: {currentEmployee.employeeNo}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            <Calendar size={16} className="inline mr-1" />
            日期:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">线路:</label>
          <select
            value={selectedRouteId || ''}
            onChange={(e) => setSelectedRoute(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择线路</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name} ({route.direction === 'morning' ? '早班' : '晚班'} {route.departureTime})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

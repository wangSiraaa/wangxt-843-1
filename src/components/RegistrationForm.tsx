import React, { useState } from 'react';
import { MapPin, Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';

export const RegistrationForm: React.FC = () => {
  const {
    selectedRouteId,
    selectedDate,
    currentEmployeeId,
    routes,
    getStopCapacity,
    isStopFull,
    registerEmployee,
    getEmployeeById,
    registrations,
    cancelRegistration,
  } = useShuttleStore();

  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const currentEmployee = getEmployeeById(currentEmployeeId || '');

  const existingRegistration = registrations.find(
    (r) =>
      r.employeeId === currentEmployeeId &&
      r.routeId === selectedRouteId &&
      r.date === selectedDate &&
      r.status !== 'cancelled'
  );

  const handleRegister = () => {
    if (!currentEmployeeId || !selectedRouteId || !selectedStopId) {
      setMessage({ type: 'error', text: '请选择员工、线路和站点' });
      return;
    }

    const result = registerEmployee(currentEmployeeId, selectedRouteId, selectedStopId, selectedDate);
    setMessage({ type: result.success ? (result.isWaitlist ? 'info' : 'success') : 'error', text: result.message });

    if (result.success) {
      setSelectedStopId('');
    }

    setTimeout(() => setMessage(null), 5000);
  };

  const handleCancel = () => {
    if (!existingRegistration) return;
    const result = cancelRegistration(existingRegistration.id);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请先选择一条线路</p>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请先选择当前员工</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-green-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">报名表单</h2>
        <span className="ml-auto text-sm text-gray-500">
          <Clock size={14} className="inline mr-1" />
          {selectedRoute.departureTime} {selectedRoute.direction === 'morning' ? '早班' : '晚班'}
        </span>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : message.type === 'error' ? (
            <XCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      {existingRegistration ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-sm font-medium text-gray-600">已报名站点:</span>
                <span className="ml-2 font-semibold text-gray-800">
                  {selectedRoute.stops.find((s) => s.id === existingRegistration.stopId)?.name}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  existingRegistration.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : existingRegistration.status === 'waitlist'
                    ? 'bg-yellow-100 text-yellow-700'
                    : existingRegistration.status === 'checked-in'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {existingRegistration.status === 'confirmed'
                  ? '已确认'
                  : existingRegistration.status === 'waitlist'
                  ? `候补 #${existingRegistration.waitlistPosition}`
                  : existingRegistration.status === 'checked-in'
                  ? '已签到'
                  : '已取消'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              报名时间: {new Date(existingRegistration.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>

          {existingRegistration.status !== 'cancelled' && existingRegistration.status !== 'checked-in' && (
            <button
              onClick={handleCancel}
              className="w-full py-3 px-4 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors"
            >
              取消报名
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择站点</label>
            <div className="grid grid-cols-1 gap-3">
              {selectedRoute.stops
                .sort((a, b) => a.order - b.order)
                .map((stop) => {
                  const capacity = getStopCapacity(selectedRoute.id, stop.id);
                  const full = isStopFull(selectedRoute.id, stop.id, selectedDate);
                  const canWaitlist = stop.waitlistEnabled && full;

                  return (
                    <label
                      key={stop.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedStopId === stop.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${full && !canWaitlist ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="stop"
                        value={stop.id}
                        checked={selectedStopId === stop.id}
                        onChange={() => setSelectedStopId(stop.id)}
                        disabled={full && !canWaitlist}
                        className="hidden"
                      />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">
                            {stop.order}. {stop.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {full && !canWaitlist ? (
                              <span className="text-red-500">已满员，未开启候补</span>
                            ) : full && canWaitlist ? (
                              <span className="text-yellow-600">已满员，可候补</span>
                            ) : (
                              <span className="text-green-600">可报名</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            <span className={capacity.remaining > 0 ? 'text-green-600' : 'text-red-500'}>
                              {capacity.remaining}
                            </span>
                            <span className="text-gray-400">/{capacity.total}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            已用 {capacity.used}
                            {capacity.waitlistCount > 0 && (
                              <span className="text-yellow-600"> · 候补 {capacity.waitlistCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {stop.waitlistEnabled && (
                        <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                          <AlertCircle size={12} />
                          支持候补队列
                        </div>
                      )}
                    </label>
                  );
                })}
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={!selectedStopId}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              selectedStopId
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            立即报名
          </button>
        </div>
      )}
    </div>
  );
};

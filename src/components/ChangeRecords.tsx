import React, { useState } from 'react';
import { RefreshCw, ArrowRight, FileText, MapPin, Minimize2, Maximize2 } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';
import type { FoldRecord } from '../types';

export const ChangeRecords: React.FC = () => {
  const {
    changeRecords,
    employees,
    routes,
    currentEmployeeId,
    viewMode,
    registrations,
    changeRegistration,
    selectedDate,
    getFoldRecordsForRoute,
    selectedRouteId,
  } = useShuttleStore();

  const [showChangeForm, setShowChangeForm] = useState(false);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [newStopId, setNewStopId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'change' | 'fold'>('change');

  const filteredRecords =
    viewMode === 'employee' && currentEmployeeId
      ? changeRecords.filter((r) => r.employeeId === currentEmployeeId)
      : changeRecords;

  const myRegistrations = registrations.filter(
    (r) =>
      r.employeeId === currentEmployeeId &&
      r.date === selectedDate &&
      r.status !== 'cancelled' &&
      r.status !== 'checked-in'
  );

  const handleChange = () => {
    if (!selectedRegistrationId || !newRouteId || !newStopId || !reason) {
      setMessage({ type: 'error', text: '请填写完整的改签信息' });
      return;
    }

    const result = changeRegistration(selectedRegistrationId, newRouteId, newStopId, reason);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });

    if (result.success) {
      setShowChangeForm(false);
      setSelectedRegistrationId('');
      setNewRouteId('');
      setNewStopId('');
      setReason('');
    }

    setTimeout(() => setMessage(null), 5000);
  };

  const getRouteName = (routeId: string) => routes.find((r) => r.id === routeId)?.name || '未知线路';
  const getStopName = (routeId: string, stopId: string) => {
    const route = routes.find((r) => r.id === routeId);
    return route?.stops.find((s) => s.id === stopId)?.name || '未知站点';
  };
  const getEmployeeName = (employeeId: string) =>
    employees.find((e) => e.id === employeeId)?.name || '未知员工';

  const newRoute = routes.find((r) => r.id === newRouteId);

  const foldRecords = selectedRouteId ? getFoldRecordsForRoute(selectedRouteId, selectedDate) : [];

  const getFoldStopName = (record: FoldRecord) => {
    const route = routes.find((r) => r.id === record.routeId);
    return route?.stops.find((s) => s.id === record.stopId)?.name || '未知站点';
  };

  const getFoldRouteName = (record: FoldRecord) => {
    return routes.find((r) => r.id === record.routeId)?.name || '未知线路';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="text-purple-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">历史记录</h2>
        </div>

        {viewMode === 'employee' && currentEmployeeId && myRegistrations.length > 0 && activeSubTab === 'change' && (
          <button
            onClick={() => setShowChangeForm(!showChangeForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <RefreshCw size={16} />
            申请改签
          </button>
        )}
      </div>

      {viewMode !== 'employee' && (
        <div className="mb-6 border-b border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('change')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === 'change'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <RefreshCw size={14} className="inline mr-1" />
              改签记录 ({filteredRecords.length})
            </button>
            <button
              onClick={() => setActiveSubTab('fold')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === 'fold'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Minimize2 size={14} className="inline mr-1" />
              折叠记录 ({foldRecords.length})
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {showChangeForm && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-4">改签申请</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">原报名记录</label>
              <select
                value={selectedRegistrationId}
                onChange={(e) => setSelectedRegistrationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">请选择原报名</option>
                {myRegistrations.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {getRouteName(reg.routeId)} - {getStopName(reg.routeId, reg.stopId)} (
                    {reg.status === 'confirmed' ? '已确认' : `候补 #${reg.waitlistPosition}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">新线路</label>
              <select
                value={newRouteId}
                onChange={(e) => {
                  setNewRouteId(e.target.value);
                  setNewStopId('');
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">请选择新线路</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
            </div>

            {newRoute && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新站点</label>
                <select
                  value={newStopId}
                  onChange={(e) => setNewStopId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">请选择新站点</option>
                  {newRoute.stops.sort((a, b) => a.order - b.order).map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.order}. {stop.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">改签原因</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请输入改签原因"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleChange}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              确认改签
            </button>
            <button
              onClick={() => setShowChangeForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'change' ? (
        <>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无改签记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">员工</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">原线路</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">新线路</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">原因</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">日期</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...filteredRecords]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{getEmployeeName(record.employeeId)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{getRouteName(record.oldRouteId)}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {getStopName(record.oldRouteId, record.oldStopId)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ArrowRight size={20} className="text-gray-400" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{getRouteName(record.newRouteId)}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {getStopName(record.newRouteId, record.newStopId)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{record.reason}</td>
                        <td className="px-4 py-3 text-gray-600">{record.date}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {foldRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Minimize2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无折叠记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">线路</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">站点</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作人</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">日期</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">操作时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {foldRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{getFoldRouteName(record)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 flex items-center gap-1">
                          <MapPin size={14} className="text-gray-400" />
                          {getFoldStopName(record)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.isFolded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            <Minimize2 size={12} />
                            折叠
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            <Maximize2 size={12} />
                            展开
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{record.operatedBy}</td>
                      <td className="px-4 py-3 text-gray-600">{record.date}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(record.operatedAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

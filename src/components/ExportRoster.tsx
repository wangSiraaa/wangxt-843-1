import React from 'react';
import { Download, FileSpreadsheet, Users, MapPin } from 'lucide-react';
import { useShuttleStore } from '../store/useShuttleStore';

export const ExportRoster: React.FC = () => {
  const { selectedRouteId, selectedDate, routes, exportRoster, getDriverRoster, getEmployeeById } =
    useShuttleStore();

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  const handleExport = () => {
    if (!selectedRouteId) return;

    const csv = exportRoster(selectedRouteId, selectedDate);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `乘车名单_${selectedRoute?.name || '线路'}_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!selectedRoute) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center text-gray-500 py-8">
          <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-300" />
          <p>请先选择一条线路</p>
        </div>
      </div>
    );
  }

  const driverRoster = getDriverRoster(selectedRoute.id, selectedDate);
  const totalPassengers = driverRoster.reduce((sum, r) => sum + r.registrations.length, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-orange-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">乘车名单</h2>
          <span className="text-sm text-gray-500">
            <Users size={14} className="inline mr-1" />
            共 {totalPassengers} 人
          </span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          <Download size={16} />
          导出 CSV
        </button>
      </div>

      <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-semibold text-orange-800">{selectedRoute.name}</div>
            <div className="text-sm text-orange-600">
              {selectedRoute.departureTime} {selectedRoute.direction === 'morning' ? '早班' : '晚班'}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-600">司机: {selectedRoute.driverName}</div>
            <div className="text-sm text-gray-600">日期: {selectedDate}</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">站点</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">员工姓名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">工号</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">部门</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">手机号</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {driverRoster.map(({ stop, registrations }) =>
              registrations.length === 0 ? (
                <tr key={`empty-${stop.id}`}>
                  <td colSpan={6} className="px-4 py-2 text-center text-gray-400">
                    {stop.name} - 暂无乘车人员
                  </td>
                </tr>
              ) : (
                registrations.map((reg, idx) => {
                  const employee = getEmployeeById(reg.employeeId);
                  return (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {idx === 0 && (
                          <div className="flex items-center gap-1 text-gray-700">
                            <MapPin size={14} />
                            <span className="font-medium">{stop.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{employee?.name || '未知'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee?.employeeNo || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee?.department || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{employee?.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            reg.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : reg.status === 'checked-in'
                              ? 'bg-blue-100 text-blue-700'
                              : reg.status === 'waitlist'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {reg.status === 'confirmed'
                            ? '已确认'
                            : reg.status === 'checked-in'
                            ? '已签到'
                            : reg.status === 'waitlist'
                            ? '候补'
                            : '已取消'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

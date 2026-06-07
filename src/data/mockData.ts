import type { Route, Employee, Registration, WaitlistEntry, ChangeRecord, CheckInRecord } from '../types';

export const getToday = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const mockEmployees: Employee[] = [
  { id: 'e1', name: '张三', department: '技术部', employeeNo: 'EMP001', phone: '13800138001' },
  { id: 'e2', name: '李四', department: '产品部', employeeNo: 'EMP002', phone: '13800138002' },
  { id: 'e3', name: '王五', department: '市场部', employeeNo: 'EMP003', phone: '13800138003' },
  { id: 'e4', name: '赵六', department: '人事部', employeeNo: 'EMP004', phone: '13800138004' },
  { id: 'e5', name: '钱七', department: '财务部', employeeNo: 'EMP005', phone: '13800138005' },
  { id: 'e6', name: '孙八', department: '技术部', employeeNo: 'EMP006', phone: '13800138006' },
  { id: 'e7', name: '周九', department: '运营部', employeeNo: 'EMP007', phone: '13800138007' },
  { id: 'e8', name: '吴十', department: '技术部', employeeNo: 'EMP008', phone: '13800138008' },
  { id: 'e9', name: '郑十一', department: '产品部', employeeNo: 'EMP009', phone: '13800138009' },
  { id: 'e10', name: '冯十二', department: '市场部', employeeNo: 'EMP010', phone: '13800138010' },
];

export const mockRoutes: Route[] = [
  {
    id: 'r1',
    name: 'A线 - 中关村方向',
    direction: 'morning',
    departureTime: '07:30',
    driverName: '刘师傅',
    busNo: '京A12345',
    stops: [
      { id: 's1', name: '国贸站', order: 1, capacity: 5, waitlistEnabled: true },
      { id: 's2', name: '西单站', order: 2, capacity: 3, waitlistEnabled: true },
      { id: 's3', name: '西二旗站', order: 3, capacity: 8, waitlistEnabled: false },
    ],
  },
  {
    id: 'r2',
    name: 'B线 - 望京方向',
    direction: 'morning',
    departureTime: '07:45',
    driverName: '陈师傅',
    busNo: '京A67890',
    stops: [
      { id: 's4', name: '双井站', order: 1, capacity: 6, waitlistEnabled: false },
      { id: 's5', name: '望京西站', order: 2, capacity: 4, waitlistEnabled: true },
      { id: 's6', name: '来广营站', order: 3, capacity: 10, waitlistEnabled: true },
    ],
  },
  {
    id: 'r3',
    name: 'C线 - 亦庄方向',
    direction: 'evening',
    departureTime: '18:00',
    driverName: '杨师傅',
    busNo: '京A11111',
    stops: [
      { id: 's7', name: '公司东门', order: 1, capacity: 10, waitlistEnabled: true },
      { id: 's8', name: '宋家庄站', order: 2, capacity: 5, waitlistEnabled: false },
      { id: 's9', name: '荣昌东街站', order: 3, capacity: 8, waitlistEnabled: true },
    ],
  },
];

const today = getToday();

export const mockRegistrations: Registration[] = [
  { id: 'reg1', employeeId: 'e1', routeId: 'r1', stopId: 's1', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'reg2', employeeId: 'e2', routeId: 'r1', stopId: 's1', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 23).toISOString() },
  { id: 'reg3', employeeId: 'e3', routeId: 'r1', stopId: 's1', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 22).toISOString() },
  { id: 'reg4', employeeId: 'e4', routeId: 'r1', stopId: 's1', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 21).toISOString() },
  { id: 'reg5', employeeId: 'e5', routeId: 'r1', stopId: 's1', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 20).toISOString() },
  { id: 'reg6', employeeId: 'e6', routeId: 'r1', stopId: 's2', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 19).toISOString() },
  { id: 'reg7', employeeId: 'e7', routeId: 'r1', stopId: 's2', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 18).toISOString() },
  { id: 'reg8', employeeId: 'e8', routeId: 'r1', stopId: 's2', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 17).toISOString() },
  { id: 'reg9', employeeId: 'e9', routeId: 'r2', stopId: 's4', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 16).toISOString() },
  { id: 'reg10', employeeId: 'e10', routeId: 'r2', stopId: 's5', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 15).toISOString() },
  { id: 'reg11', employeeId: 'e1', routeId: 'r2', stopId: 's5', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: 'reg12', employeeId: 'e2', routeId: 'r2', stopId: 's5', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 13).toISOString() },
  { id: 'reg13', employeeId: 'e3', routeId: 'r2', stopId: 's5', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'reg14', employeeId: 'e4', routeId: 'r3', stopId: 's7', date: today, status: 'confirmed', createdAt: new Date(Date.now() - 3600000 * 11).toISOString() },
  { id: 'reg15', employeeId: 'e5', routeId: 'r1', stopId: 's3', date: today, status: 'checked-in', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
];

export const mockWaitlistEntries: WaitlistEntry[] = [
  { id: 'w1', registrationId: 'reg-wait1', employeeId: 'e6', routeId: 'r1', stopId: 's1', date: today, position: 1, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'w2', registrationId: 'reg-wait2', employeeId: 'e7', routeId: 'r1', stopId: 's1', date: today, position: 2, createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
];

export const mockChangeRecords: ChangeRecord[] = [
  { id: 'c1', employeeId: 'e1', oldRouteId: 'r1', newRouteId: 'r2', oldStopId: 's1', newStopId: 's4', date: today, reason: '工作安排调整', createdAt: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: 'c2', employeeId: 'e3', oldRouteId: 'r2', newRouteId: 'r1', oldStopId: 's5', newStopId: 's2', date: today, reason: '搬家了', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
];

export const mockCheckInRecords: CheckInRecord[] = [
  { id: 'ci1', registrationId: 'reg15', employeeId: 'e5', routeId: 'r1', stopId: 's3', date: today, checkedInAt: new Date(Date.now() - 3600000 * 2).toISOString(), checkedInBy: '刘师傅' },
];

export const mockWaitlistRegistrations: Registration[] = [
  { id: 'reg-wait1', employeeId: 'e6', routeId: 'r1', stopId: 's1', date: today, status: 'waitlist', createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), waitlistPosition: 1 },
  { id: 'reg-wait2', employeeId: 'e7', routeId: 'r1', stopId: 's1', date: today, status: 'waitlist', createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), waitlistPosition: 2 },
];

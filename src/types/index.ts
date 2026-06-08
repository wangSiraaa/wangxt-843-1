export interface Employee {
  id: string;
  name: string;
  department: string;
  employeeNo: string;
  phone: string;
}

export interface Stop {
  id: string;
  name: string;
  order: number;
  capacity: number;
  waitlistEnabled: boolean;
}

export interface Route {
  id: string;
  name: string;
  direction: 'morning' | 'evening';
  departureTime: string;
  stops: Stop[];
  driverName: string;
  busNo: string;
}

export type RegistrationStatus = 'confirmed' | 'waitlist' | 'cancelled' | 'checked-in';

export interface Registration {
  id: string;
  employeeId: string;
  routeId: string;
  stopId: string;
  date: string;
  status: RegistrationStatus;
  createdAt: string;
  waitlistPosition?: number;
}

export interface WaitlistEntry {
  id: string;
  registrationId: string;
  employeeId: string;
  routeId: string;
  stopId: string;
  date: string;
  position: number;
  createdAt: string;
}

export interface ChangeRecord {
  id: string;
  employeeId: string;
  oldRouteId: string;
  newRouteId: string;
  oldStopId: string;
  newStopId: string;
  date: string;
  reason: string;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  registrationId: string;
  employeeId: string;
  routeId: string;
  stopId: string;
  date: string;
  checkedInAt: string;
  checkedInBy: string;
}

export interface FoldRecord {
  id: string;
  routeId: string;
  stopId: string;
  date: string;
  isFolded: boolean;
  operatedBy: string;
  operatedAt: string;
}

export type ViewMode = 'employee' | 'admin' | 'driver';

export interface AppState {
  routes: Route[];
  employees: Employee[];
  registrations: Registration[];
  waitlistEntries: WaitlistEntry[];
  changeRecords: ChangeRecord[];
  checkInRecords: CheckInRecord[];
  foldRecords: FoldRecord[];
  foldedStops: Record<string, boolean>;
  selectedRouteId: string | null;
  selectedDate: string;
  viewMode: ViewMode;
  currentEmployeeId: string | null;
}

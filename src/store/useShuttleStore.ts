import { create } from 'zustand';
import type {
  AppState,
  Registration,
  WaitlistEntry,
  ChangeRecord,
  CheckInRecord,
  Stop,
  Route,
  RegistrationStatus,
} from '../types';
import {
  mockRoutes,
  mockEmployees,
  mockRegistrations,
  mockWaitlistEntries,
  mockWaitlistRegistrations,
  mockChangeRecords,
  mockCheckInRecords,
  getToday,
} from '../data/mockData';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

interface ShuttleStore extends AppState {
  setSelectedRoute: (routeId: string | null) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  setCurrentEmployee: (employeeId: string | null) => void;
  getStopCapacity: (routeId: string, stopId: string) => { total: number; used: number; remaining: number; waitlistCount: number };
  getStopConfirmedCount: (routeId: string, stopId: string, date: string) => number;
  getStopWaitlistCount: (routeId: string, stopId: string, date: string) => number;
  isStopFull: (routeId: string, stopId: string, date: string) => boolean;
  registerEmployee: (employeeId: string, routeId: string, stopId: string, date: string) => { success: boolean; message: string; isWaitlist: boolean };
  cancelRegistration: (registrationId: string, reason?: string) => { success: boolean; message: string };
  changeRegistration: (registrationId: string, newRouteId: string, newStopId: string, reason: string) => { success: boolean; message: string };
  toggleWaitlistEnabled: (routeId: string, stopId: string) => void;
  promoteFromWaitlist: (waitlistEntryId: string) => { success: boolean; message: string };
  checkInEmployee: (registrationId: string, checkedInBy: string) => { success: boolean; message: string };
  exportRoster: (routeId: string, date: string) => string;
  getDriverRoster: (routeId: string, date: string) => { stop: Stop; registrations: Registration[] }[];
  getWaitlistForStop: (routeId: string, stopId: string, date: string) => WaitlistEntry[];
  getRouteById: (routeId: string) => Route | undefined;
  getStopById: (routeId: string, stopId: string) => Stop | undefined;
  getEmployeeById: (employeeId: string) => typeof mockEmployees[0] | undefined;
  resetStore: () => void;
}

const getInitialState = (): Omit<AppState, 'selectedRouteId' | 'selectedDate' | 'viewMode' | 'currentEmployeeId'> => ({
  routes: JSON.parse(JSON.stringify(mockRoutes)),
  employees: JSON.parse(JSON.stringify(mockEmployees)),
  registrations: JSON.parse(JSON.stringify([...mockRegistrations, ...mockWaitlistRegistrations])),
  waitlistEntries: JSON.parse(JSON.stringify(mockWaitlistEntries)),
  changeRecords: JSON.parse(JSON.stringify(mockChangeRecords)),
  checkInRecords: JSON.parse(JSON.stringify(mockCheckInRecords)),
});

export const useShuttleStore = create<ShuttleStore>((set, get) => ({
  ...getInitialState(),
  selectedRouteId: 'r1',
  selectedDate: getToday(),
  viewMode: 'employee',
  currentEmployeeId: 'e8',

  setSelectedRoute: (routeId) => set({ selectedRouteId: routeId }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentEmployee: (employeeId) => set({ currentEmployeeId: employeeId }),

  getRouteById: (routeId) => {
    return get().routes.find((r) => r.id === routeId);
  },

  getStopById: (routeId, stopId) => {
    const route = get().routes.find((r) => r.id === routeId);
    return route?.stops.find((s) => s.id === stopId);
  },

  getEmployeeById: (employeeId) => {
    return get().employees.find((e) => e.id === employeeId);
  },

  getStopConfirmedCount: (routeId, stopId, date) => {
    return get().registrations.filter(
      (r) =>
        r.routeId === routeId &&
        r.stopId === stopId &&
        r.date === date &&
        (r.status === 'confirmed' || r.status === 'checked-in')
    ).length;
  },

  getStopWaitlistCount: (routeId, stopId, date) => {
    return get().waitlistEntries.filter(
      (w) => w.routeId === routeId && w.stopId === stopId && w.date === date
    ).length;
  },

  getStopCapacity: (routeId, stopId) => {
    const route = get().routes.find((r) => r.id === routeId);
    const stop = route?.stops.find((s) => s.id === stopId);
    if (!stop) return { total: 0, used: 0, remaining: 0, waitlistCount: 0 };

    const date = get().selectedDate;
    const used = get().getStopConfirmedCount(routeId, stopId, date);
    const waitlistCount = get().getStopWaitlistCount(routeId, stopId, date);
    const remaining = Math.max(0, stop.capacity - used);

    return { total: stop.capacity, used, remaining, waitlistCount };
  },

  isStopFull: (routeId, stopId, date) => {
    const route = get().routes.find((r) => r.id === routeId);
    const stop = route?.stops.find((s) => s.id === stopId);
    if (!stop) return false;

    const confirmedCount = get().getStopConfirmedCount(routeId, stopId, date);
    return confirmedCount >= stop.capacity;
  },

  getWaitlistForStop: (routeId, stopId, date) => {
    return get()
      .waitlistEntries.filter((w) => w.routeId === routeId && w.stopId === stopId && w.date === date)
      .sort((a, b) => a.position - b.position);
  },

  registerEmployee: (employeeId, routeId, stopId, date) => {
    const state = get();
    const stop = state.getStopById(routeId, stopId);
    if (!stop) {
      return { success: false, message: '站点不存在', isWaitlist: false };
    }

    const existingRegistration = state.registrations.find(
      (r) => r.employeeId === employeeId && r.routeId === routeId && r.date === date && r.status !== 'cancelled'
    );
    if (existingRegistration) {
      return { success: false, message: '您已经报名了该线路', isWaitlist: false };
    }

    const isFull = state.isStopFull(routeId, stopId, date);
    const regId = generateId();
    const now = new Date().toISOString();

    if (isFull) {
      if (!stop.waitlistEnabled) {
        return { success: false, message: '该站点已满员，且未开启候补队列', isWaitlist: false };
      }

      const currentWaitlist = state.getWaitlistForStop(routeId, stopId, date);
      const newPosition = currentWaitlist.length + 1;

      const newRegistration: Registration = {
        id: regId,
        employeeId,
        routeId,
        stopId,
        date,
        status: 'waitlist',
        createdAt: now,
        waitlistPosition: newPosition,
      };

      const newWaitlistEntry: WaitlistEntry = {
        id: generateId(),
        registrationId: regId,
        employeeId,
        routeId,
        stopId,
        date,
        position: newPosition,
        createdAt: now,
      };

      set((state) => ({
        registrations: [...state.registrations, newRegistration],
        waitlistEntries: [...state.waitlistEntries, newWaitlistEntry],
      }));

      return { success: true, message: `站点已满，您已进入候补队列，位置：${newPosition}`, isWaitlist: true };
    }

    const newRegistration: Registration = {
      id: regId,
      employeeId,
      routeId,
      stopId,
      date,
      status: 'confirmed',
      createdAt: now,
    };

    set((state) => ({
      registrations: [...state.registrations, newRegistration],
    }));

    return { success: true, message: '报名成功', isWaitlist: false };
  },

  cancelRegistration: (registrationId, _reason) => {
    const state = get();
    const registration = state.registrations.find((r) => r.id === registrationId);
    if (!registration) {
      return { success: false, message: '报名记录不存在' };
    }

    if (registration.status === 'cancelled') {
      return { success: false, message: '该报名已取消' };
    }

    const wasConfirmed = registration.status === 'confirmed' || registration.status === 'checked-in';
    const wasWaitlist = registration.status === 'waitlist';

    set((state) => ({
      registrations: state.registrations.map((r) =>
        r.id === registrationId ? { ...r, status: 'cancelled' as RegistrationStatus } : r
      ),
    }));

    if (wasWaitlist) {
      set((state) => {
        const remainingWaitlist = state.waitlistEntries
          .filter((w) => w.registrationId !== registrationId)
          .sort((a, b) => a.position - b.position)
          .map((w, idx) => ({ ...w, position: idx + 1 }));

        const updatedRegistrations = state.registrations.map((r) => {
          const wlEntry = remainingWaitlist.find((w) => w.registrationId === r.id);
          if (wlEntry) {
            return { ...r, waitlistPosition: wlEntry.position };
          }
          return r;
        });

        return {
          waitlistEntries: remainingWaitlist,
          registrations: updatedRegistrations,
        };
      });
    }

    if (wasConfirmed) {
      const waitlistForStop = state.getWaitlistForStop(
        registration.routeId,
        registration.stopId,
        registration.date
      );
      if (waitlistForStop.length > 0) {
        const firstInLine = waitlistForStop[0];
        state.promoteFromWaitlist(firstInLine.id);
      }
    }

    return { success: true, message: '取消成功' };
  },

  changeRegistration: (registrationId, newRouteId, newStopId, reason) => {
    const state = get();
    const oldRegistration = state.registrations.find((r) => r.id === registrationId);
    if (!oldRegistration) {
      return { success: false, message: '原报名记录不存在' };
    }

    if (oldRegistration.status === 'cancelled') {
      return { success: false, message: '该报名已取消，无法改签' };
    }

    const cancelResult = state.cancelRegistration(registrationId, reason);
    if (!cancelResult.success) {
      return cancelResult;
    }

    const registerResult = state.registerEmployee(
      oldRegistration.employeeId,
      newRouteId,
      newStopId,
      oldRegistration.date
    );
    if (!registerResult.success) {
      return registerResult;
    }

    const newRegistration = state.registrations.find(
      (r) =>
        r.employeeId === oldRegistration.employeeId &&
        r.routeId === newRouteId &&
        r.stopId === newStopId &&
        r.date === oldRegistration.date &&
        r.status !== 'cancelled'
    );

    if (newRegistration) {
      const changeRecord: ChangeRecord = {
        id: generateId(),
        employeeId: oldRegistration.employeeId,
        oldRouteId: oldRegistration.routeId,
        newRouteId,
        oldStopId: oldRegistration.stopId,
        newStopId,
        date: oldRegistration.date,
        reason,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        changeRecords: [...state.changeRecords, changeRecord],
      }));
    }

    return { success: true, message: registerResult.message };
  },

  toggleWaitlistEnabled: (routeId, stopId) => {
    set((state) => ({
      routes: state.routes.map((route) => {
        if (route.id !== routeId) return route;
        return {
          ...route,
          stops: route.stops.map((stop) =>
            stop.id === stopId ? { ...stop, waitlistEnabled: !stop.waitlistEnabled } : stop
          ),
        };
      }),
    }));
  },

  promoteFromWaitlist: (waitlistEntryId) => {
    const state = get();
    const waitlistEntry = state.waitlistEntries.find((w) => w.id === waitlistEntryId);
    if (!waitlistEntry) {
      return { success: false, message: '候补记录不存在' };
    }

    const stop = state.getStopById(waitlistEntry.routeId, waitlistEntry.stopId);
    if (!stop) {
      return { success: false, message: '站点不存在' };
    }

    const isFull = state.isStopFull(waitlistEntry.routeId, waitlistEntry.stopId, waitlistEntry.date);
    if (isFull) {
      return { success: false, message: '站点仍然满员，无法转正' };
    }

    set((state) => {
      const updatedRegistrations = state.registrations.map((r) =>
        r.id === waitlistEntry.registrationId
          ? { ...r, status: 'confirmed' as RegistrationStatus, waitlistPosition: undefined }
          : r
      );

      const remainingWaitlist = state.waitlistEntries
        .filter((w) => w.id !== waitlistEntryId)
        .sort((a, b) => a.position - b.position)
        .map((w, idx) => ({ ...w, position: idx + 1 }));

      const finalRegistrations = updatedRegistrations.map((r) => {
        const wlEntry = remainingWaitlist.find((w) => w.registrationId === r.id);
        if (wlEntry) {
          return { ...r, waitlistPosition: wlEntry.position };
        }
        return r;
      });

      return {
        registrations: finalRegistrations,
        waitlistEntries: remainingWaitlist,
      };
    });

    return { success: true, message: '候补转正成功' };
  },

  checkInEmployee: (registrationId, checkedInBy) => {
    const state = get();
    const registration = state.registrations.find((r) => r.id === registrationId);
    if (!registration) {
      return { success: false, message: '报名记录不存在' };
    }

    if (registration.status === 'cancelled') {
      return { success: false, message: '该报名已取消' };
    }

    if (registration.status === 'checked-in') {
      return { success: false, message: '已签到' };
    }

    const checkInRecord: CheckInRecord = {
      id: generateId(),
      registrationId,
      employeeId: registration.employeeId,
      routeId: registration.routeId,
      stopId: registration.stopId,
      date: registration.date,
      checkedInAt: new Date().toISOString(),
      checkedInBy,
    };

    set((state) => ({
      registrations: state.registrations.map((r) =>
        r.id === registrationId ? { ...r, status: 'checked-in' as RegistrationStatus } : r
      ),
      checkInRecords: [...state.checkInRecords, checkInRecord],
    }));

    return { success: true, message: '签到成功' };
  },

  getDriverRoster: (routeId, date) => {
    const state = get();
    const route = state.routes.find((r) => r.id === routeId);
    if (!route) return [];

    return route.stops
      .sort((a, b) => a.order - b.order)
      .map((stop) => ({
        stop,
        registrations: state.registrations.filter(
          (r) =>
            r.routeId === routeId &&
            r.stopId === stop.id &&
            r.date === date &&
            (r.status === 'confirmed' || r.status === 'checked-in')
        ),
      }));
  },

  exportRoster: (routeId, date) => {
    const state = get();
    const route = state.routes.find((r) => r.id === routeId);
    if (!route) return '';

    const driverRoster = state.getDriverRoster(routeId, date);
    let csv = '线路,站点,员工姓名,工号,部门,手机号,状态,签到时间\n';

    driverRoster.forEach(({ stop, registrations }) => {
      registrations.forEach((reg) => {
        const employee = state.employees.find((e) => e.id === reg.employeeId);
        const checkIn = state.checkInRecords.find((c) => c.registrationId === reg.id);
        csv += `${route.name},${stop.name},${employee?.name || ''},${employee?.employeeNo || ''},${employee?.department || ''},${employee?.phone || ''},${reg.status},${checkIn?.checkedInAt || ''}\n`;
      });
    });

    return csv;
  },

  resetStore: () => {
    set({
      ...getInitialState(),
      selectedRouteId: 'r1',
      selectedDate: getToday(),
      viewMode: 'employee',
      currentEmployeeId: 'e8',
    });
  },
}));

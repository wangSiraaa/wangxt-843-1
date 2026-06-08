import { create } from 'zustand';
import type {
  AppState,
  Registration,
  WaitlistEntry,
  Stop,
  Route,
  RegistrationStatus,
  FoldRecord,
} from '../src/types';
import {
  mockRoutes,
  mockEmployees,
  mockRegistrations,
  mockWaitlistEntries,
  mockWaitlistRegistrations,
  mockChangeRecords,
  mockCheckInRecords,
  getToday,
} from '../src/data/mockData';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

interface TestStore extends AppState {
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
  getDriverRoster: (routeId: string, date: string) => { stop: Stop; registrations: Registration[] }[];
  getWaitlistForStop: (routeId: string, stopId: string, date: string) => WaitlistEntry[];
  getRouteById: (routeId: string) => Route | undefined;
  getStopById: (routeId: string, stopId: string) => Stop | undefined;
  getEmployeeById: (employeeId: string) => typeof mockEmployees[0] | undefined;
  promoteFromWaitlist: (waitlistEntryId: string) => { success: boolean; message: string };
  toggleStopFolded: (routeId: string, stopId: string, date: string, operatedBy: string) => void;
  isStopFolded: (routeId: string, stopId: string, date: string) => boolean;
  getFoldRecordsForRoute: (routeId: string, date: string) => FoldRecord[];
  resetStore: () => void;
}

const getInitialState = (): Omit<AppState, 'selectedRouteId' | 'selectedDate' | 'viewMode' | 'currentEmployeeId'> => ({
  routes: JSON.parse(JSON.stringify(mockRoutes)),
  employees: JSON.parse(JSON.stringify(mockEmployees)),
  registrations: JSON.parse(JSON.stringify([...mockRegistrations, ...mockWaitlistRegistrations])),
  waitlistEntries: JSON.parse(JSON.stringify(mockWaitlistEntries)),
  changeRecords: JSON.parse(JSON.stringify(mockChangeRecords)),
  checkInRecords: JSON.parse(JSON.stringify(mockCheckInRecords)),
  foldRecords: [],
  foldedStops: {},
});

const createTestStore = () => {
  return create<TestStore>((set, get) => ({
    ...getInitialState(),
    selectedRouteId: 'r1',
    selectedDate: getToday(),
    viewMode: 'admin',
    currentEmployeeId: 'e8',

    setSelectedRoute: (routeId) => set({ selectedRouteId: routeId }),
    setSelectedDate: (date) => set({ selectedDate: date }),
    setViewMode: (mode) => {
      if (mode === 'driver') {
        set({ viewMode: mode, selectedDate: getToday() });
      } else {
        set({ viewMode: mode });
      }
    },
    setCurrentEmployee: (employeeId) => set({ currentEmployeeId: employeeId }),

    getRouteById: (routeId) => get().routes.find((r) => r.id === routeId),
    getStopById: (routeId, stopId) => {
      const route = get().routes.find((r) => r.id === routeId);
      return route?.stops.find((s) => s.id === stopId);
    },
    getEmployeeById: (employeeId) => get().employees.find((e) => e.id === employeeId),

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
      return get().waitlistEntries.filter((w) => w.routeId === routeId && w.stopId === stopId && w.date === date).length;
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

    registerEmployee: (employeeId, routeId, stopId, date) => {
      const state = get();
      const stop = state.getStopById(routeId, stopId);
      if (!stop) {
        return { success: false, message: '站点不存在', isWaitlist: false };
      }

      const existingRegistration = state.registrations.find(
        (r) =>
          r.employeeId === employeeId && r.routeId === routeId && r.date === date && r.status !== 'cancelled'
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

    isStopFolded: (routeId, stopId, date) => {
      const key = `${routeId}-${stopId}-${date}`;
      return get().foldedStops[key] || false;
    },

    toggleStopFolded: (routeId, stopId, date, operatedBy) => {
      const key = `${routeId}-${stopId}-${date}`;
      const state = get();
      const currentFolded = state.foldedStops[key] || false;
      const newFolded = !currentFolded;

      const foldRecord: FoldRecord = {
        id: generateId(),
        routeId,
        stopId,
        date,
        isFolded: newFolded,
        operatedBy,
        operatedAt: new Date().toISOString(),
      };

      set((state) => ({
        foldedStops: {
          ...state.foldedStops,
          [key]: newFolded,
        },
        foldRecords: [...state.foldRecords, foldRecord],
      }));
    },

    getFoldRecordsForRoute: (routeId, date) => {
      const allRecords = get().foldRecords;
      return allRecords
        .map((record, index) => ({ record, originalIndex: index }))
        .filter((item) => item.record.routeId === routeId && item.record.date === date)
        .sort((a, b) => {
          const timeDiff = new Date(b.record.operatedAt).getTime() - new Date(a.record.operatedAt).getTime();
          if (timeDiff !== 0) return timeDiff;
          return b.originalIndex - a.originalIndex;
        })
        .map((item) => item.record);
    },

    resetStore: () => {
      set({
        ...getInitialState(),
        selectedRouteId: 'r1',
        selectedDate: getToday(),
        viewMode: 'admin',
        currentEmployeeId: 'e8',
        foldRecords: [],
        foldedStops: {},
      });
    },
  }));
};

const runFoldAssertions = async (): Promise<{ passed: number; failed: number; details: string[] }> => {
  const store = createTestStore();
  const details: string[] = [];
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, description: string): boolean => {
    if (condition) {
      passed++;
      details.push(`✅ PASS: ${testName}`);
      details.push(`   ${description}`);
      return true;
    } else {
      failed++;
      details.push(`❌ FAIL: ${testName}`);
      details.push(`   ${description}`);
      return false;
    }
  };

  const logSection = (title: string) => {
    details.push('');
    details.push('='.repeat(60));
    details.push(`📋 ${title}`);
    details.push('='.repeat(60));
  };

  const logInfo = (msg: string) => {
    details.push(`   ℹ️  ${msg}`);
  };

  logSection('测试1: 站点折叠状态切换');

  const testDate = getToday();
  const routeId = 'r1';
  const stopId = 's1';
  const stop = store.getState().getStopById(routeId, stopId)!;
  const driverName = '刘师傅';

  logInfo(`测试站点: ${stop.name}`);

  const isFoldedInitially = store.getState().isStopFolded(routeId, stopId, testDate);
  assert(
    isFoldedInitially === false,
    '初始状态为展开',
    `初始折叠状态=${isFoldedInitially} (期望: false)`
  );

  logInfo('执行折叠操作...');
  store.getState().toggleStopFolded(routeId, stopId, testDate, driverName);

  const isFoldedAfter = store.getState().isStopFolded(routeId, stopId, testDate);
  assert(
    isFoldedAfter === true,
    '折叠操作生效',
    `折叠后状态=${isFoldedAfter} (期望: true)`
  );

  logInfo('执行展开操作...');
  store.getState().toggleStopFolded(routeId, stopId, testDate, driverName);

  const isFoldedAfterToggle = store.getState().isStopFolded(routeId, stopId, testDate);
  assert(
    isFoldedAfterToggle === false,
    '展开操作生效',
    `展开后状态=${isFoldedAfterToggle} (期望: false)`
  );

  logSection('测试2: 折叠操作记录到历史');

  const foldRecords = store.getState().getFoldRecordsForRoute(routeId, testDate);
  logInfo(`折叠记录数量: ${foldRecords.length}`);

  assert(
    foldRecords.length === 2,
    '两次折叠操作都被记录',
    `记录数量=${foldRecords.length} (期望: 2)`
  );

  if (foldRecords.length >= 2) {
    assert(
      foldRecords[0].isFolded === false && foldRecords[1].isFolded === true,
      '折叠记录按时间倒序排列',
      `最新记录isFolded=${foldRecords[0].isFolded}, 次新记录isFolded=${foldRecords[1].isFolded}`
    );

    assert(
      foldRecords[0].operatedBy === driverName && foldRecords[1].operatedBy === driverName,
      '操作人信息正确记录',
      `操作人=${foldRecords[0].operatedBy} (期望: ${driverName})`
    );

    assert(
      foldRecords[0].stopId === stopId && foldRecords[0].routeId === routeId,
      '站点和线路信息正确记录',
      `线路=${foldRecords[0].routeId}, 站点=${foldRecords[0].stopId}`
    );
  }

  logSection('测试3: 满员站点只能候补（原有逻辑保留）');

  const cap = store.getState().getStopCapacity(routeId, stopId);
  logInfo(`站点状态: 容量=${cap.total}, 已用=${cap.used}, 剩余=${cap.remaining}`);

  assert(
    cap.remaining === 0,
    '站点初始状态为满员',
    `剩余座位=${cap.remaining} (期望: 0)`
  );

  const newEmpId = 'e9';
  logInfo(`员工 ${store.getState().getEmployeeById(newEmpId)?.name} 尝试报名满员站点...`);
  
  const result = store.getState().registerEmployee(newEmpId, routeId, stopId, testDate);
  
  assert(
    result.success === true && result.isWaitlist === true,
    '满员站点报名自动进入候补',
    `报名结果: success=${result.success}, isWaitlist=${result.isWaitlist}`
  );

  const capAfter = store.getState().getStopCapacity(routeId, stopId);
  assert(
    capAfter.remaining === 0 && capAfter.used === 5,
    '候补不占用站点容量',
    `报名后: 已用=${capAfter.used}, 剩余=${capAfter.remaining} (期望: 已用=5, 剩余=0)`
  );

  assert(
    capAfter.waitlistCount === 3,
    '候补人数正确增加',
    `候补人数=${capAfter.waitlistCount} (期望: 3)`
  );

  logSection('测试4: 重置数据后折叠记录清空');

  store.getState().resetStore();
  const foldRecordsAfterReset = store.getState().getFoldRecordsForRoute(routeId, testDate);
  
  assert(
    foldRecordsAfterReset.length === 0,
    '重置后折叠记录为空',
    `重置后记录数量=${foldRecordsAfterReset.length} (期望: 0)`
  );

  const isFoldedAfterReset = store.getState().isStopFolded(routeId, stopId, testDate);
  assert(
    isFoldedAfterReset === false,
    '重置后折叠状态恢复为展开',
    `重置后折叠状态=${isFoldedAfterReset} (期望: false)`
  );

  logSection('测试汇总');

  const total = passed + failed;
  details.push('');
  details.push('='.repeat(60));
  details.push(`📊 测试结果: ${passed}/${total} 通过`);
  details.push('='.repeat(60));
  details.push(`   ✅ 通过: ${passed}`);
  details.push(`   ❌ 失败: ${failed}`);

  if (failed === 0) {
    details.push('');
    details.push('🎉 所有测试通过！');
    details.push('');
    details.push('核心验证点:');
    details.push('  1. ✅ 站点折叠状态切换正常');
    details.push('  2. ✅ 折叠操作记录到历史');
    details.push('  3. ✅ 折叠记录包含完整信息（操作人、站点、时间）');
    details.push('  4. ✅ 满员站点只能候补（原有逻辑保留）');
    details.push('  5. ✅ 候补不占用站点容量');
    details.push('  6. ✅ 重置数据后折叠状态和记录清空');
  } else {
    details.push('');
    details.push('⚠️  存在测试失败，请检查代码逻辑');
  }

  return { passed, failed, details };
};

const isMainModule = (): boolean => {
  try {
    return import.meta.url === `file://${process.argv[1]}`;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  console.log('Starting fold assertions...');
  runFoldAssertions()
    .then(({ passed, failed, details }) => {
      console.log(details.join('\n'));
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('❌ 测试运行出错:', err);
      process.exit(1);
    });
}

export { runFoldAssertions };

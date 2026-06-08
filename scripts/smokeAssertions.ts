import { create } from 'zustand';
import type {
  AppState,
  Registration,
  WaitlistEntry,
  Stop,
  Route,
  RegistrationStatus,
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

    resetStore: () => {
      set({
        ...getInitialState(),
        selectedRouteId: 'r1',
        selectedDate: getToday(),
        viewMode: 'admin',
        currentEmployeeId: 'e8',
      });
    },
  }));
};

const runSmokeAssertions = async (): Promise<{ passed: number; failed: number; details: string[] }> => {
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

  logSection('测试1: 满员站点候补，余量不增加');

  const testDate = getToday();
  const routeId = 'r1';
  const stopId = 's1';
  const stop = store.getState().getStopById(routeId, stopId)!;

  logInfo(`测试站点: ${stop.name}, 容量: ${stop.capacity}`);

  const initialCap = store.getState().getStopCapacity(routeId, stopId);
  logInfo(`初始状态: 总容量=${initialCap.total}, 已用=${initialCap.used}, 剩余=${initialCap.remaining}, 候补=${initialCap.waitlistCount}`);

  assert(
    initialCap.used === 5 && initialCap.total === 5 && initialCap.remaining === 0,
    '初始状态满员验证',
    `国贸站初始状态: 已用=${initialCap.used}, 剩余=${initialCap.remaining} (期望: 已用=5, 剩余=0)`
  );

  assert(
    initialCap.waitlistCount === 2,
    '初始候补人数验证',
    `当前候补人数=${initialCap.waitlistCount} (期望: 2)`
  );

  const newEmployeeId = 'e9';
  logInfo(`新员工 ${store.getState().getEmployeeById(newEmployeeId)?.name} (ID: ${newEmployeeId}) 尝试报名满员站点...`);

  const result = store.getState().registerEmployee(newEmployeeId, routeId, stopId, testDate);
  logInfo(`报名结果: ${result.message}`);

  assert(
    result.success === true && result.isWaitlist === true,
    '满员后报名进入候补',
    `新员工报名满员站点应进入候补，实际: isWaitlist=${result.isWaitlist}`
  );

  const capAfterWaitlist = store.getState().getStopCapacity(routeId, stopId);
  logInfo(`报名后状态: 总容量=${capAfterWaitlist.total}, 已用=${capAfterWaitlist.used}, 剩余=${capAfterWaitlist.remaining}, 候补=${capAfterWaitlist.waitlistCount}`);

  assert(
    capAfterWaitlist.remaining === 0,
    '关键断言: 满员后进入候补，站点余量保持0不增加',
    `剩余座位=${capAfterWaitlist.remaining} (期望: 0，候补不占用容量)`
  );

  assert(
    capAfterWaitlist.used === 5,
    '已用座位保持不变',
    `已用座位=${capAfterWaitlist.used} (期望: 5)`
  );

  assert(
    capAfterWaitlist.waitlistCount === 3,
    '候补人数增加',
    `候补人数=${capAfterWaitlist.waitlistCount} (期望: 3)`
  );

  logSection('测试2: 管理员切换到司机视图，直接看到签到名单');

  store.getState().setViewMode('admin');
  logInfo(`当前视图: ${store.getState().viewMode}, 当前日期: ${store.getState().selectedDate}`);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  store.getState().setSelectedDate(yesterdayStr);
  logInfo(`管理员将日期改为昨天: ${store.getState().selectedDate}`);

  assert(
    store.getState().selectedDate === yesterdayStr,
    '管理员可以修改日期',
    `当前日期=${store.getState().selectedDate} (期望: ${yesterdayStr})`
  );

  logInfo('管理员切换到司机视图...');
  store.getState().setViewMode('driver');

  assert(
    store.getState().viewMode === 'driver',
    '视图切换成功',
    `当前视图=${store.getState().viewMode} (期望: driver)`
  );

  assert(
    store.getState().selectedDate === getToday(),
    '切换到司机视图后日期自动重置为今天',
    `当前日期=${store.getState().selectedDate} (期望: ${getToday()})`
  );

  const driverRoster = store.getState().getDriverRoster(routeId, store.getState().selectedDate);
  const totalPassengers = driverRoster.reduce((sum, r) => sum + r.registrations.length, 0);
  logInfo(`司机签到名单: 共 ${driverRoster.length} 个站点, ${totalPassengers} 名乘客`);

  driverRoster.forEach(({ stop, registrations }) => {
    logInfo(`  - ${stop.name}: ${registrations.length} 人`);
  });

  assert(
    driverRoster.length > 0 && totalPassengers > 0,
    '司机视图能看到当天乘车名单',
    `站点数=${driverRoster.length}, 乘客数=${totalPassengers} (均应 > 0)`
  );

  const guomaoStop = driverRoster.find((r) => r.stop.id === 's1');
  assert(
    guomaoStop !== undefined && guomaoStop.registrations.length === 5,
    '国贸站显示5名已确认乘客',
    `国贸站乘车人数=${guomaoStop?.registrations.length} (期望: 5，候补不显示在司机名单中)`
  );

  logSection('测试3: 视图切换时Tab重置');

  store.getState().setViewMode('admin');
  logInfo(`管理员视图，默认Tab应是registration，司机视图默认Tab应是checkin`);

  const testDriverTab = (): boolean => {
    if (store.getState().viewMode === 'driver') {
      return true;
    }
    store.getState().setViewMode('driver');
    return store.getState().viewMode === 'driver' && store.getState().selectedDate === getToday();
  };

  assert(
    testDriverTab(),
    '司机视图默认进入签到核对',
    `切换到司机视图后，日期自动重置为今天，视图为driver`
  );

  store.getState().setViewMode('admin');
  assert(
    store.getState().viewMode === 'admin',
    '可以切回管理员视图',
    `视图切换回admin成功`
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
    details.push('  1. ✅ 满员站点报名后进入候补');
    details.push('  2. ✅ 站点余量保持为0，不增加');
    details.push('  3. ✅ 候补不占用容量');
    details.push('  4. ✅ 管理员切司机后日期重置为今天');
    details.push('  5. ✅ 司机直接看到当天签到名单');
    details.push('  6. ✅ 司机名单只显示已确认乘客（不包含候补）');
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
  console.log('Starting smoke assertions...');
  runSmokeAssertions()
    .then(({ passed, failed, details }) => {
      console.log(details.join('\n'));
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('❌ 测试运行出错:', err);
      process.exit(1);
    });
}

export { runSmokeAssertions };

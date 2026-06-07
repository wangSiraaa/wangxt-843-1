import { create } from 'zustand';
import type {
  AppState,
  Registration,
  WaitlistEntry,
  Stop,
  Route,
  RegistrationStatus,
} from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const getToday = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const testRoutes: Route[] = [
  {
    id: 'test-r1',
    name: '测试线路 - A线',
    direction: 'morning',
    departureTime: '08:00',
    driverName: '张司机',
    busNo: '京B00001',
    stops: [
      { id: 'test-s1', name: '国贸站', order: 1, capacity: 3, waitlistEnabled: true },
      { id: 'test-s2', name: '西单站', order: 2, capacity: 2, waitlistEnabled: true },
      { id: 'test-s3', name: '西二旗站', order: 3, capacity: 5, waitlistEnabled: false },
    ],
  },
];

const testEmployees = [
  { id: 'test-e1', name: '测试员工1', department: '技术部', employeeNo: 'TEST001', phone: '13800000001' },
  { id: 'test-e2', name: '测试员工2', department: '产品部', employeeNo: 'TEST002', phone: '13800000002' },
  { id: 'test-e3', name: '测试员工3', department: '市场部', employeeNo: 'TEST003', phone: '13800000003' },
  { id: 'test-e4', name: '测试员工4', department: '人事部', employeeNo: 'TEST004', phone: '13800000004' },
  { id: 'test-e5', name: '测试员工5', department: '财务部', employeeNo: 'TEST005', phone: '13800000005' },
  { id: 'test-e6', name: '测试员工6', department: '运营部', employeeNo: 'TEST006', phone: '13800000006' },
];

interface TestStore extends AppState {
  setSelectedRoute: (routeId: string | null) => void;
  setSelectedDate: (date: string) => void;
  getStopCapacity: (routeId: string, stopId: string) => { total: number; used: number; remaining: number; waitlistCount: number };
  getStopConfirmedCount: (routeId: string, stopId: string, date: string) => number;
  getStopWaitlistCount: (routeId: string, stopId: string, date: string) => number;
  isStopFull: (routeId: string, stopId: string, date: string) => boolean;
  registerEmployee: (employeeId: string, routeId: string, stopId: string, date: string) => { success: boolean; message: string; isWaitlist: boolean };
  cancelRegistration: (registrationId: string, reason?: string) => { success: boolean; message: string };
  getWaitlistForStop: (routeId: string, stopId: string, date: string) => WaitlistEntry[];
  getRouteById: (routeId: string) => Route | undefined;
  getStopById: (routeId: string, stopId: string) => Stop | undefined;
  promoteFromWaitlist: (waitlistEntryId: string) => { success: boolean; message: string };
  toggleWaitlistEnabled: (routeId: string, stopId: string) => void;
  resetStore: () => void;
}

const createTestStore = () => {
  return create<TestStore>((set, get) => ({
    routes: JSON.parse(JSON.stringify(testRoutes)),
    employees: JSON.parse(JSON.stringify(testEmployees)),
    registrations: [],
    waitlistEntries: [],
    changeRecords: [],
    checkInRecords: [],
    selectedRouteId: 'test-r1',
    selectedDate: getToday(),
    viewMode: 'admin',
    currentEmployeeId: null,

    setSelectedRoute: (routeId) => set({ selectedRouteId: routeId }),
    setSelectedDate: (date) => set({ selectedDate: date }),

    getRouteById: (routeId) => get().routes.find((r) => r.id === routeId),
    getStopById: (routeId, stopId) => {
      const route = get().routes.find((r) => r.id === routeId);
      return route?.stops.find((s) => s.id === stopId);
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

    cancelRegistration: (registrationId) => {
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

    resetStore: () => {
      set({
        routes: JSON.parse(JSON.stringify(testRoutes)),
        employees: JSON.parse(JSON.stringify(testEmployees)),
        registrations: [],
        waitlistEntries: [],
        changeRecords: [],
        checkInRecords: [],
        selectedRouteId: 'test-r1',
        selectedDate: getToday(),
        viewMode: 'admin',
        currentEmployeeId: null,
      });
    },
  }));
};

export const runSmokeTest = (): string => {
  const store = createTestStore();
  const output: string[] = [];
  const testDate = getToday();
  const routeId = 'test-r1';
  const stopId = 'test-s1';

  const log = (msg: string) => {
    output.push(msg);
    console.log(msg);
  };

  const logStep = (step: string) => {
    log(`\n${'='.repeat(60)}`);
    log(`🚀 ${step}`);
    log(`${'='.repeat(60)}`);
  };

  const logCapacity = (label: string) => {
    const cap = store.getState().getStopCapacity(routeId, stopId);
    const waitlist = store.getState().getWaitlistForStop(routeId, stopId, testDate);
    log(`   📊 ${label}:`);
    log(`      总容量: ${cap.total} | 已用: ${cap.used} | 剩余: ${cap.remaining} | 候补: ${cap.waitlistCount}`);
    if (waitlist.length > 0) {
      log(`      候补队列: [${waitlist.map((w) => `#${w.position} ${store.getState().employees.find((e) => e.id === w.employeeId)?.name}`).join(', ')}]`);
    }
  };

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      log(`   ✅ ${msg}`);
    } else {
      log(`   ❌ ${msg} - 测试失败!`);
      throw new Error(msg);
    }
  };

  try {
    logStep('初始化测试环境');
    log(`📅 测试日期: ${testDate}`);
    log(`🚌 测试线路: ${store.getState().getRouteById(routeId)?.name}`);
    log(`📍 测试站点: ${store.getState().getStopById(routeId, stopId)?.name} (容量: 3人)`);
    logCapacity('初始状态');

    assert(store.getState().registrations.length === 0, '初始报名记录为空');
    assert(store.getState().waitlistEntries.length === 0, '初始候补队列为空');

    logStep('场景1: 正常报名 - 站点未满时直接确认');

    for (let i = 1; i <= 3; i++) {
      const employeeId = `test-e${i}`;
      const employee = store.getState().employees.find((e) => e.id === employeeId)!;
      log(`\n   👤 员工${i} (${employee.name}) 正在报名...`);

      const result = store.getState().registerEmployee(employeeId, routeId, stopId, testDate);
      log(`      结果: ${result.message}`);

      assert(result.success === true, `员工${i}报名成功`);
      assert(result.isWaitlist === false, `员工${i}直接确认，不进入候补`);

      const registration = store
        .getState()
        .registrations.find((r) => r.employeeId === employeeId && r.stopId === stopId)!;
      assert(registration.status === 'confirmed', `员工${i}状态为confirmed`);

      logCapacity(`报名后状态`);
      assert(
        store.getState().getStopCapacity(routeId, stopId).remaining === 3 - i,
        `剩余座位正确 (${3 - i})`
      );
    }

    logStep('场景2: 满员后报名 - 自动进入候补队列');

    const capacityBefore = store.getState().getStopCapacity(routeId, stopId);
    log(`   📌 报名前剩余座位: ${capacityBefore.remaining}`);
    assert(capacityBefore.remaining === 0, '站点已满员 (剩余座位=0)');
    assert(capacityBefore.waitlistCount === 0, '当前候补队列为空');

    for (let i = 4; i <= 6; i++) {
      const employeeId = `test-e${i}`;
      const employee = store.getState().employees.find((e) => e.id === employeeId)!;
      const expectedPosition = i - 3;

      log(`\n   👤 员工${i} (${employee.name}) 正在报名满员站点...`);

      const result = store.getState().registerEmployee(employeeId, routeId, stopId, testDate);
      log(`      结果: ${result.message}`);

      assert(result.success === true, `员工${i}候补报名成功`);
      assert(result.isWaitlist === true, `员工${i}进入候补队列`);
      assert(result.message.includes(`位置：${expectedPosition}`), `候补位置正确 (#${expectedPosition})`);

      const registration = store
        .getState()
        .registrations.find((r) => r.employeeId === employeeId && r.stopId === stopId)!;
      assert(registration.status === 'waitlist', `员工${i}状态为waitlist`);
      assert(registration.waitlistPosition === expectedPosition, `员工${i}候补位置为${expectedPosition}`);

      logCapacity(`员工${i}报名后状态`);

      const capAfter = store.getState().getStopCapacity(routeId, stopId);
      assert(capAfter.remaining === 0, '关键验证: 剩余座位保持为0，不增加!');
      assert(capAfter.used === 3, '关键验证: 已用座位保持为3，不增加!');
      assert(capAfter.waitlistCount === expectedPosition, `候补人数正确 (${expectedPosition})`);
    }

    logStep('场景3: 验证候补队列顺序');
    const waitlist = store.getState().getWaitlistForStop(routeId, stopId, testDate);
    assert(waitlist.length === 3, '候补队列有3人');

    for (let i = 0; i < waitlist.length; i++) {
      const entry = waitlist[i];
      const employee = store.getState().employees.find((e) => e.id === entry.employeeId)!;
      assert(entry.position === i + 1, `${employee.name} 候补位置为 #${i + 1}`);
    }

    logStep('场景4: 取消确认报名 - 自动触发候补转正');

    const cancelEmployeeId = 'test-e1';
    const cancelEmployee = store.getState().employees.find((e) => e.id === cancelEmployeeId)!;
    const cancelRegistration = store
      .getState()
      .registrations.find((r) => r.employeeId === cancelEmployeeId && r.status === 'confirmed')!;

    log(`   👤 员工1 (${cancelEmployee.name}) 取消报名...`);
    const cancelResult = store.getState().cancelRegistration(cancelRegistration.id);
    log(`      结果: ${cancelResult.message}`);

    assert(cancelResult.success === true, '取消报名成功');

    const oldReg = store.getState().registrations.find((r) => r.id === cancelRegistration.id)!;
    assert(oldReg.status === 'cancelled', '原报名状态变为cancelled');

    logCapacity('取消后状态');

    const capAfterCancel = store.getState().getStopCapacity(routeId, stopId);
    assert(capAfterCancel.remaining === 0, '候补自动转正后，剩余座位仍为0');
    assert(capAfterCancel.used === 3, '已用座位仍为3');
    assert(capAfterCancel.waitlistCount === 2, '候补队列减少为2人');

    const promotedEmployee = store.getState().employees.find((e) => e.id === 'test-e4')!;
    const promotedReg = store
      .getState()
      .registrations.find((r) => r.employeeId === 'test-e4' && r.stopId === stopId)!;
    assert(promotedReg.status === 'confirmed', `${promotedEmployee.name} 自动转正为confirmed`);
    assert(promotedReg.waitlistPosition === undefined, '转正后waitlistPosition清除');

    const newWaitlist = store.getState().getWaitlistForStop(routeId, stopId, testDate);
    for (let i = 0; i < newWaitlist.length; i++) {
      const entry = newWaitlist[i];
      const employee = store.getState().employees.find((e) => e.id === entry.employeeId)!;
      assert(entry.position === i + 1, `转正后 ${employee.name} 位置更新为 #${i + 1}`);
    }

    logStep('场景5: 取消候补报名 - 候补队列重排');

    const cancelWaitlistId = 'test-e5';
    const cancelWaitlistReg = store
      .getState()
      .registrations.find((r) => r.employeeId === cancelWaitlistId && r.status === 'waitlist')!;

    log(`   👤 员工5 取消候补报名...`);
    const cancelWLResult = store.getState().cancelRegistration(cancelWaitlistReg.id);
    log(`      结果: ${cancelWLResult.message}`);

    assert(cancelWLResult.success === true, '取消候补成功');

    logCapacity('取消候补后状态');
    const capAfterWLCancel = store.getState().getStopCapacity(routeId, stopId);
    assert(capAfterWLCancel.waitlistCount === 1, '候补队列减少为1人');

    const remainingWaitlist = store.getState().getWaitlistForStop(routeId, stopId, testDate);
    assert(remainingWaitlist.length === 1, '剩余1人在候补队列');
    assert(remainingWaitlist[0].position === 1, '剩余人员位置重排为#1');

    logStep('场景6: 关闭候补队列 - 满员后无法报名');

    log(`   🔧 管理员关闭国贸站候补队列...`);
    store.getState().toggleWaitlistEnabled(routeId, stopId);

    const stopAfterToggle = store.getState().getStopById(routeId, stopId)!;
    assert(stopAfterToggle.waitlistEnabled === false, '候补队列已关闭');

    const testEmployeeId = 'test-e6';
    log(`   👤 员工6 尝试报名满员且已关闭候补的站点...`);
    const failedResult = store.getState().registerEmployee(testEmployeeId, routeId, stopId, testDate);
    log(`      结果: ${failedResult.message}`);

    assert(failedResult.success === false, '报名失败');
    assert(failedResult.message.includes('未开启候补队列'), '提示未开启候补队列');

    logStep('测试完成 - 汇总验证');

    const finalCap = store.getState().getStopCapacity(routeId, stopId);
    const finalRegs = store.getState().registrations;
    const finalWaitlist = store.getState().waitlistEntries;

    log(`\n   📋 最终统计:`);
    log(`      总容量: ${finalCap.total}`);
    log(`      已确认: ${finalCap.used} 人`);
    log(`      剩余: ${finalCap.remaining} 人`);
    log(`      候补: ${finalCap.waitlistCount} 人`);
    log(`      总报名记录: ${finalRegs.length} 条`);
    log(`      总候补记录: ${finalWaitlist.length} 条`);

    assert(finalCap.remaining === 0, '最终剩余座位为0');
    assert(finalCap.used === 3, '最终已用座位为3');
    assert(finalCap.waitlistCount === 1, '最终候补人数为1');

    log(`\n${'='.repeat(60)}`);
    log(`🎉 所有测试通过! 核心验证总结:`);
    log(`${'='.repeat(60)}`);
    log(`   ✅ 1. 站点未满时，报名直接确认，剩余座位减少`);
    log(`   ✅ 2. 站点满员后，新报名自动进入候补队列`);
    log(`   ✅ 3. 关键验证: 满员后进入候补，站点余量不再增加 (保持为0)`);
    log(`   ✅ 4. 候补队列按报名顺序排列，位置正确`);
    log(`   ✅ 5. 确认报名取消后，候补第一位自动转正`);
    log(`   ✅ 6. 候补转正后，剩余候补位置自动重排`);
    log(`   ✅ 7. 候补报名取消后，剩余候补位置自动重排`);
    log(`   ✅ 8. 关闭候补队列后，满员站点无法报名`);
    log(`\n${'='.repeat(60)}`);

    return output.join('\n');
  } catch (error: any) {
    log(`\n\n❌ 测试失败: ${error.message}`);
    log(`\n${'='.repeat(60)}`);
    log(`   测试终止 - 请检查代码逻辑`);
    log(`${'='.repeat(60)}`);
    return output.join('\n');
  }
};

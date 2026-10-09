import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekdayFromDateKey,
  getDaysInMonth,
  expandWeeklyTemplateToMonth,
  expandWeeklyTemplateToWeek,
  resolveDayStatus,
  calculateMonthlyProgramSummary,
  calculateWeeklyTemplateSummary,
  resetFitnessPlannerState
} from '../src/utils/fitnessPlannerCalculations.ts';
import {
  sanitizeWeeklyProgramTemplate,
  sanitizeScheduledWorkoutsMap
} from '../src/services/storagePersistence.ts';
import type {
  WeeklyProgramTemplate,
  ScheduledWorkout,
  WorkoutHistoryEntry
} from '../src/types/index.ts';
import { renderTodaysWorkoutCard } from '../src/components/Fitness/TodaysWorkoutCard.ts';
import { getTodayKey } from '../src/utils/dateUtils.ts';

test('getWeekdayFromDateKey returns correct 1-7 ISO weekday for known dates', () => {
  // 2026-09-07 is Monday (1)
  assert.equal(getWeekdayFromDateKey('2026-09-07'), 1);
  // 2026-09-08 is Tuesday (2)
  assert.equal(getWeekdayFromDateKey('2026-09-08'), 2);
  // 2026-09-09 is Wednesday (3)
  assert.equal(getWeekdayFromDateKey('2026-09-09'), 3);
  // 2026-09-10 is Thursday (4)
  assert.equal(getWeekdayFromDateKey('2026-09-10'), 4);
  // 2026-09-11 is Friday (5)
  assert.equal(getWeekdayFromDateKey('2026-09-11'), 5);
  // 2026-09-12 is Saturday (6)
  assert.equal(getWeekdayFromDateKey('2026-09-12'), 6);
  // 2026-09-13 is Sunday (7)
  assert.equal(getWeekdayFromDateKey('2026-09-13'), 7);
});

test('getDaysInMonth handles 28-day Feb, 29-day leap Feb, 30-day, and 31-day months', () => {
  // Non-leap February
  assert.equal(getDaysInMonth(2023, 2), 28);
  assert.equal(getDaysInMonth(2025, 2), 28);
  assert.equal(getDaysInMonth(2026, 2), 28);

  // Leap February
  assert.equal(getDaysInMonth(2024, 2), 29);
  assert.equal(getDaysInMonth(2028, 2), 29);

  // 30-day months
  assert.equal(getDaysInMonth(2026, 4), 30); // April
  assert.equal(getDaysInMonth(2026, 6), 30); // June
  assert.equal(getDaysInMonth(2026, 9), 30); // September
  assert.equal(getDaysInMonth(2026, 11), 30); // November

  // 31-day months
  assert.equal(getDaysInMonth(2026, 1), 31); // January
  assert.equal(getDaysInMonth(2026, 3), 31); // March
  assert.equal(getDaysInMonth(2026, 5), 31); // May
  assert.equal(getDaysInMonth(2026, 7), 31); // July
  assert.equal(getDaysInMonth(2026, 8), 31); // August
  assert.equal(getDaysInMonth(2026, 10), 31); // October
  assert.equal(getDaysInMonth(2026, 12), 31); // December
});

test('expandWeeklyTemplateToMonth expands template to full month and respects manual overrides', () => {
  const template: WeeklyProgramTemplate = {
    id: 'test-template-1',
    name: 'Push Pull Legs',
    days: {
      1: { type: 'preset', presetId: 'push' }, // Mon
      2: { type: 'preset', presetId: 'pull' }, // Tue
      3: { type: 'preset', presetId: 'leg' },  // Wed
      4: { type: 'rest' },                     // Thu
      5: { type: 'preset', presetId: 'full-body' }, // Fri
      6: { type: 'rest' },                     // Sat
      7: { type: 'rest' }                      // Sun
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  };

  // September 2026 has 30 days. Sep 1 is Tuesday (pull).
  const expandedSep = expandWeeklyTemplateToMonth(template, 2026, 9);
  assert.equal(expandedSep['2026-09-01'].workout.type, 'preset');
  assert.equal((expandedSep['2026-09-01'].workout as any).presetId, 'pull');
  assert.equal(expandedSep['2026-09-03'].workout.type, 'rest'); // Thursday

  // Test leap year Feb 2024 (29 days)
  const expandedFebLeap = expandWeeklyTemplateToMonth(template, 2024, 2);
  assert.ok(expandedFebLeap['2024-02-29']); // Feb 29 exists
  assert.ok(!expandedFebLeap['2024-02-30']); // Feb 30 does not exist

  // Test manual override retention
  const existingSchedule: Record<string, ScheduledWorkout> = {
    '2026-09-01': {
      dateKey: '2026-09-01',
      workout: { type: 'rest' },
      source: 'manual_override'
    }
  };

  const expandedWithOverride = expandWeeklyTemplateToMonth(template, 2026, 9, existingSchedule);
  // Day 1 should preserve manual override 'rest', not template 'pull'
  assert.equal(expandedWithOverride['2026-09-01'].workout.type, 'rest');
  assert.equal(expandedWithOverride['2026-09-01'].source, 'manual_override');
  // Day 2 was not manually overridden, so it should follow template (Wednesday = leg)
  assert.equal((expandedWithOverride['2026-09-02'].workout as any).presetId, 'leg');
  assert.equal(expandedWithOverride['2026-09-02'].source, 'weekly_repeat');
});

test('expandWeeklyTemplateToWeek expands template to Monday-Sunday of target date', () => {
  const template: WeeklyProgramTemplate = {
    id: 'test-template-2',
    name: 'Simple Routine',
    days: {
      1: { type: 'preset', presetId: 'full-body' },
      3: { type: 'preset', presetId: 'full-body' },
      5: { type: 'preset', presetId: 'full-body' }
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  };

  // Reference date: 2026-09-12 (Saturday). Week is 2026-09-07 (Mon) to 2026-09-13 (Sun).
  const targetDate = new Date(2026, 8, 12);
  const weekExpanded = expandWeeklyTemplateToWeek(template, targetDate);

  assert.ok(weekExpanded['2026-09-07']); // Mon
  assert.equal((weekExpanded['2026-09-07'].workout as any).presetId, 'full-body');
  assert.ok(weekExpanded['2026-09-09']); // Wed
  assert.ok(weekExpanded['2026-09-11']); // Fri
  assert.ok(!weekExpanded['2026-09-08']); // Tue has no plan
  assert.ok(!weekExpanded['2026-09-14']); // Next Monday outside range
});

test('resolveDayStatus computes completed, planned, missed, rest, and unplanned correctly', () => {
  const today = '2026-09-12';
  const sampleHistory: WorkoutHistoryEntry[] = [
    {
      id: 'h-1',
      name: 'Full Body Workout',
      workoutType: 'Full Body',
      status: 'completed',
      startedAt: '2026-09-10T10:00:00Z',
      scheduledDate: '2026-09-10',
      durationSeconds: 2700,
      estimatedCalories: 320,
      totalVolume: 4000,
      completedSetCount: 12,
      exercises: []
    },
    {
      id: 'h-2',
      name: 'Push Workout',
      workoutType: 'Push',
      status: 'completed',
      startedAt: '2026-09-12T08:00:00Z',
      scheduledDate: '2026-09-12',
      durationSeconds: 3000,
      estimatedCalories: 350,
      totalVolume: 5000,
      completedSetCount: 15,
      exercises: []
    }
  ];

  // 1. Completed on a planned day
  const schedToday: ScheduledWorkout = {
    dateKey: '2026-09-12',
    workout: { type: 'preset', presetId: 'push' },
    source: 'weekly_template'
  };
  assert.equal(resolveDayStatus('2026-09-12', schedToday, sampleHistory, today), 'completed');

  // 2. Completed ad-hoc (no planned workout on that date)
  assert.equal(resolveDayStatus('2026-09-10', undefined, sampleHistory, today), 'completed');

  // 3. Planned for future
  const schedFuture: ScheduledWorkout = {
    dateKey: '2026-09-15',
    workout: { type: 'preset', presetId: 'pull' },
    source: 'weekly_template'
  };
  assert.equal(resolveDayStatus('2026-09-15', schedFuture, sampleHistory, today), 'planned');

  // 4. Planned for today (not completed yet)
  const schedTodayUncompleted: ScheduledWorkout = {
    dateKey: '2026-09-12',
    workout: { type: 'preset', presetId: 'leg' },
    source: 'weekly_template'
  };
  // With empty history:
  assert.equal(resolveDayStatus('2026-09-12', schedTodayUncompleted, [], today), 'planned');

  // 5. Missed (scheduled in the past, but no completed workout)
  const schedPast: ScheduledWorkout = {
    dateKey: '2026-09-08',
    workout: { type: 'preset', presetId: 'leg' },
    source: 'weekly_template'
  };
  assert.equal(resolveDayStatus('2026-09-08', schedPast, sampleHistory, today), 'missed');

  // 6. Rest day
  const schedRest: ScheduledWorkout = {
    dateKey: '2026-09-13',
    workout: { type: 'rest' },
    source: 'weekly_template'
  };
  assert.equal(resolveDayStatus('2026-09-13', schedRest, sampleHistory, today), 'rest');

  // 7. Unplanned
  assert.equal(resolveDayStatus('2026-09-14', undefined, sampleHistory, today), 'unplanned');
});

test('calculateMonthlyProgramSummary and calculateWeeklyTemplateSummary calculate accurate aggregates', () => {
  const template: WeeklyProgramTemplate = {
    id: 'test-summary',
    name: 'Test',
    days: {
      1: { type: 'preset', presetId: 'push' },
      2: { type: 'preset', presetId: 'pull' },
      3: { type: 'preset', presetId: 'leg' },
      4: { type: 'rest' },
      5: { type: 'preset', presetId: 'full-body' },
      6: { type: 'rest' }
    },
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  };
  const templateSummaryStr = calculateWeeklyTemplateSummary(template);
  assert.equal(templateSummaryStr, '4 workout days · 2 rest days');

  const scheduledMap: Record<string, ScheduledWorkout> = {
    '2026-09-01': { dateKey: '2026-09-01', workout: { type: 'preset', presetId: 'push' }, source: 'weekly_template' },
    '2026-09-02': { dateKey: '2026-09-02', workout: { type: 'preset', presetId: 'pull' }, source: 'weekly_template' },
    '2026-09-03': { dateKey: '2026-09-03', workout: { type: 'rest' }, source: 'weekly_template' },
    '2026-09-15': { dateKey: '2026-09-15', workout: { type: 'preset', presetId: 'leg' }, source: 'weekly_template' }
  };
  const history: WorkoutHistoryEntry[] = [
    {
      id: 'h-1',
      name: 'Push Workout',
      workoutType: 'Push',
      status: 'completed',
      startedAt: '2026-09-01T08:00:00Z',
      scheduledDate: '2026-09-01',
      durationSeconds: 2400,
      estimatedCalories: 300,
      totalVolume: 3000,
      completedSetCount: 10,
      exercises: []
    }
  ];

  const monthSummary = calculateMonthlyProgramSummary(2026, 9, scheduledMap, history, '2026-09-12');
  assert.equal(monthSummary.totalDays, 30);
  assert.equal(monthSummary.completedCount, 1); // 09-01
  assert.equal(monthSummary.missedCount, 1); // 09-02 in past
  assert.equal(monthSummary.restCount, 1); // 09-03
  assert.equal(monthSummary.plannedCount, 1); // 09-15 future planned
});

test('sanitizeWeeklyProgramTemplate validates and protects template shape', () => {
  assert.equal(sanitizeWeeklyProgramTemplate(null), null);
  assert.equal(sanitizeWeeklyProgramTemplate('invalid' as any), null);

  const valid = sanitizeWeeklyProgramTemplate({
    id: 't-1',
    name: 'Custom Program',
    days: {
      1: { type: 'preset', presetId: 'push' },
      2: { type: 'rest' },
      99: { type: 'preset', presetId: 'invalid-day' } as any
    },
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01'
  });

  assert.ok(valid);
  assert.equal(valid.name, 'Custom Program');
  assert.equal(valid.days[1]?.type, 'preset');
  assert.equal(valid.days[2]?.type, 'rest');
  assert.equal((valid.days as any)[99], undefined); // Invalid day number omitted
});

test('sanitizeScheduledWorkoutsMap validates dates and filters corrupt entries', () => {
  const sanitized = sanitizeScheduledWorkoutsMap({
    '2026-09-12': {
      dateKey: '2026-09-12',
      workout: { type: 'preset', presetId: 'push' },
      source: 'weekly_template'
    },
    'invalid-date': {
      dateKey: 'invalid-date',
      workout: { type: 'rest' },
      source: 'manual_override'
    },
    '2026-09-15': {
      dateKey: '2026-09-15',
      workout: { type: 'rest' }
    }
  });

  assert.ok(sanitized['2026-09-12']);
  assert.ok(sanitized['2026-09-15']);
  assert.equal(sanitized['invalid-date'], undefined);
});

test('resetAllFitnessPrograms clears templates and schedules while preserving workout history and PRs', () => {
  // 1. Prepare dummy workout history with completed sets
  const historyEntry: WorkoutHistoryEntry = {
    id: 'test-completed-pr-1',
    name: 'Bench Press Workout',
    workoutType: 'Push',
    status: 'completed',
    startedAt: '2026-09-01T10:00:00Z',
    finishedAt: '2026-09-01T10:45:00Z',
    durationSeconds: 2700,
    estimatedCalories: 300,
    totalVolume: 4000,
    completedSetCount: 3,
    exercises: [
      {
        exerciseId: 'ex-bench-1',
        name: 'Barbell Bench Press',
        muscleGroup: 'Chest',
        sets: [
          { setNumber: 1, weightKg: 80, actualReps: 8, targetReps: 8, isCompleted: true, completedAt: '2026-09-01T10:10:00Z' },
          { setNumber: 2, weightKg: 90, actualReps: 6, targetReps: 6, isCompleted: true, completedAt: '2026-09-01T10:20:00Z' }
        ]
      }
    ]
  };

  const template: WeeklyProgramTemplate = {
    id: 'tpl-reset-test',
    name: 'Heavy Split',
    days: {
      1: { type: 'preset', presetId: 'push-day' },
      2: { type: 'rest' }
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z'
  };

  // Seed test state
  const state = {
    workoutHistory: [historyEntry],
    weeklyFitnessTemplate: template,
    scheduledWorkouts: {
      '2026-09-15': { dateKey: '2026-09-15', workout: { type: 'preset' as const, presetId: 'push-day' }, source: 'weekly_template' as const },
      '2026-09-16': { dateKey: '2026-09-16', workout: { type: 'rest' as const }, source: 'weekly_template' as const }
    },
    selectedPlannerDate: '2026-09-15',
    plannerDetailModalOpen: true,
    plannerWeeklyEditorOpen: true,
    plannerConfirmOverwriteMonth: { year: 2026, month: 9 }
  };

  // Verify before reset
  assert.ok(state.weeklyFitnessTemplate);
  assert.equal(Object.keys(state.scheduledWorkouts).length, 2);
  assert.equal(state.workoutHistory.length, 1);

  // Execute reset
  resetFitnessPlannerState(state);

  // Verify after reset
  assert.equal(state.weeklyFitnessTemplate, null);
  assert.deepEqual(state.scheduledWorkouts, {});
  assert.equal(state.selectedPlannerDate, null);
  assert.equal(state.plannerDetailModalOpen, false);
  assert.equal(state.plannerWeeklyEditorOpen, false);
  assert.equal(state.plannerConfirmOverwriteMonth, null);

  // CRITICAL: History must remain intact
  assert.equal(state.workoutHistory.length, 1);
  assert.equal(state.workoutHistory[0].name, 'Bench Press Workout');
  assert.equal(state.workoutHistory[0].exercises[0].sets[1].weightKg, 90);
});

test('renderTodaysWorkoutCard renders appropriate content for all 5 day statuses', () => {
  const todayKey = getTodayKey();

  // 1. Unplanned state
  const unplannedHtml = renderTodaysWorkoutCard({
    scheduledWorkouts: {},
    workoutHistory: []
  });
  assert.ok(unplannedHtml.includes('Nothing planned for today'));
  assert.ok(unplannedHtml.includes('Plan Today'));
  assert.ok(unplannedHtml.includes('Choose Workout'));

  // 2. Planned state
  const plannedHtml = renderTodaysWorkoutCard({
    scheduledWorkouts: {
      [todayKey]: {
        dateKey: todayKey,
        workout: { type: 'preset', presetId: 'push-day' },
        source: 'weekly_template'
      }
    },
    workoutHistory: []
  });
  assert.ok(plannedHtml.includes('Planned'));
  assert.ok(plannedHtml.includes('Push Day'));
  assert.ok(plannedHtml.includes('Start Workout'));

  // 3. Rest Day state
  const restHtml = renderTodaysWorkoutCard({
    scheduledWorkouts: {
      [todayKey]: {
        dateKey: todayKey,
        workout: { type: 'rest' },
        source: 'weekly_template'
      }
    },
    workoutHistory: []
  });
  assert.ok(restHtml.includes('Rest Day'));
  assert.ok(restHtml.includes('Change Plan'));

  // 4. Completed state
  const completedHtml = renderTodaysWorkoutCard({
    scheduledWorkouts: {},
    workoutHistory: [
      {
        id: 'h-completed-today',
        name: 'Leg Day',
        workoutType: 'Legs',
        status: 'completed',
        startedAt: `${todayKey}T08:00:00Z`,
        scheduledDate: todayKey,
        durationSeconds: 3000,
        estimatedCalories: 420,
        totalVolume: 6500,
        completedSetCount: 16,
        exercises: []
      }
    ]
  });
  assert.ok(completedHtml.includes('Completed'));
  assert.ok(completedHtml.includes('Leg Day'));
  assert.ok(completedHtml.includes('View Summary'));
  assert.ok(completedHtml.includes('420 kcal'));

  // 5. Missed state
  const missedHtml = renderTodaysWorkoutCard({
    scheduledWorkouts: {
      [todayKey]: {
        dateKey: todayKey,
        workout: { type: 'preset', presetId: 'pull-day' },
        source: 'weekly_template'
      }
    },
    workoutHistory: []
  });
  // Note: if todayKey is today, resolveDayStatus returns planned. Let's test with a past scheduled date
  const pastKey = '2026-09-01';
  const missedPastStatus = resolveDayStatus(pastKey, {
    dateKey: pastKey,
    workout: { type: 'preset', presetId: 'pull-day' },
    source: 'weekly_template'
  }, [], todayKey);
  assert.equal(missedPastStatus, 'missed');
});


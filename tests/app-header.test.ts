import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAppHeader, type AppHeaderState } from '../src/components/Navigation/AppHeader.ts';
import { getTodayKey } from '../src/utils/dateUtils.ts';

const baseState: AppHeaderState = {
  userProfile: {
    displayName: 'Alex Morgan'
  },
  profileImageUrl: null,
  streakDays: 5,
  selectedDate: '2026-09-12',
  theme: 'light'
};

test('renderAppHeader renders greeting and initials when no profile image', () => {
  const html = renderAppHeader({
    state: baseState,
    subtitleType: 'default'
  });
  assert.ok(html.includes('Good morning, Alex Morgan'));
  assert.ok(html.includes('<span>AM</span>'));
  assert.ok(html.includes('5d'));
  assert.ok(html.includes('window.toggleTheme()'));
  assert.ok(html.includes('window.toggleQuickActions(true)'));
});

test('renderAppHeader computes single name initials properly', () => {
  const html = renderAppHeader({
    state: {
      ...baseState,
      userProfile: { displayName: 'Taylor' }
    }
  });
  assert.ok(html.includes('Good morning, Taylor'));
  assert.ok(html.includes('<span>TA</span>'));
});

test('renderAppHeader escapes displayName preventing HTML injection', () => {
  const html = renderAppHeader({
    state: {
      ...baseState,
      userProfile: { displayName: '<script>alert("xss")</script>' }
    }
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderAppHeader renders profile image when profileImageUrl is present', () => {
  const html = renderAppHeader({
    state: {
      ...baseState,
      profileImageUrl: 'https://example.com/avatar.jpg',
      streakDays: 10
    }
  });
  assert.ok(html.includes('<img src="https://example.com/avatar.jpg"'));
  assert.ok(html.includes('10d'));
});

test('renderAppHeader hides Quick Add button when showQuickAdd is false (Fitness screen behavior)', () => {
  const html = renderAppHeader({
    state: baseState,
    showQuickAdd: false
  });
  assert.ok(!html.includes('window.toggleQuickActions(true)'));
  assert.ok(html.includes('window.toggleTheme()'));
});

test('renderAppHeader handles diary subtitle with clickable calendar button', () => {
  const html = renderAppHeader({
    state: {
      ...baseState,
      selectedDate: '2026-09-10'
    },
    subtitleType: 'diary',
    selectedDate: '2026-09-10'
  });
  assert.ok(html.includes('window.openDiaryCalendar()'));
  assert.ok(html.includes('expand_more'));
  assert.ok(html.includes('Choose diary date'));
});

test('renderAppHeader handles dashboard subtitle with Show Today button when selected date is not today', () => {
  const todayKey = getTodayKey();
  const pastDate = '2025-01-01';

  const html = renderAppHeader({
    state: {
      ...baseState,
      selectedDate: pastDate
    },
    subtitleType: 'dashboard',
    selectedDate: pastDate
  });
  assert.ok(html.includes('(Show Today)'));
  assert.ok(html.includes(`window.selectDate('${todayKey}')`));
});

test('renderAppHeader customizes quickAddAriaLabel when specified', () => {
  const html = renderAppHeader({
    state: baseState,
    showQuickAdd: true,
    quickAddAriaLabel: 'Quick add'
  });
  assert.ok(html.includes('aria-label="Quick add"'));
});

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type FocusTarget = { id: string; action: string | null; index: number; start: number | null; end: number | null };
type Snapshot = {
  scroll: number[];
  details: boolean[];
  drafts: { id: string; value: string; checked?: boolean }[];
  focus?: FocusTarget;
};

const controls = 'button:not(:disabled), a[href], input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]';

/** One visible dialog, with local scrolling and no retained private DOM. */
export class Dialogs {
  private snapshots = new Map<string, Snapshot>();
  private active: HTMLElement | null = null;
  private activeKey = '';
  private opener: HTMLElement | null = null;
  private pendingOpener: HTMLElement | null = null;
  private openerAction: string | null = null;
  private backgroundScroll = 0;
  private pendingDismiss: { id: string; timer: number; afterClose: () => void } | null = null;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    const updateViewport = () => {
      const viewport = window.visualViewport;
      let top = viewport?.offsetTop ?? 0;
      let height = viewport?.height ?? window.innerHeight;
      // An iframe's own visualViewport does not report the phone keyboard.
      // Read only the visible geometry of our same-origin Streamlit host.
      try {
        const host = window.parent !== window ? window.parent.visualViewport : null;
        const frame = window.frameElement;
        if (host && frame) {
          const bounds = frame.getBoundingClientRect();
          top = Math.max(0, host.offsetTop - bounds.top);
          height = Math.max(0, Math.min(bounds.height, host.offsetTop + host.height - bounds.top) - top);
        }
      } catch { /* Cross-origin embeds keep the local viewport fallback. */ }
      document.documentElement.style.setProperty('--ui-visible-height', `${height}px`);
      document.documentElement.style.setProperty('--ui-visible-top', `${top}px`);
      this.measureNavigationHeight();
      requestAnimationFrame(() => {
        const focused = document.activeElement;
        if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement || focused instanceof HTMLSelectElement)
          || !this.active?.contains(focused)) return;
        // Keep the edited field in the dialog's scroll port after the keyboard opens.
        for (const container of [focused.closest<HTMLElement>('.ui-dialog-body'), this.panel()]) {
          if (!container) continue;
          const field = focused.getBoundingClientRect();
          const bounds = container.getBoundingClientRect();
          const bottom = Math.min(bounds.bottom, top + height - 12);
          const start = Math.max(bounds.top, top + parseFloat(getComputedStyle(this.active).paddingTop));
          if (field.bottom > bottom) container.scrollTop += field.bottom - bottom + 8;
          else if (field.top < start) container.scrollTop -= start - field.top + 8;
        }
      });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    try {
      if (window.parent !== window) {
        const host = window.parent;
        host.addEventListener('resize', updateViewport);
        host.visualViewport?.addEventListener('resize', updateViewport);
        host.visualViewport?.addEventListener('scroll', updateViewport);
        window.addEventListener('pagehide', () => {
          host.removeEventListener('resize', updateViewport);
          host.visualViewport?.removeEventListener('resize', updateViewport);
          host.visualViewport?.removeEventListener('scroll', updateViewport);
        }, { once: true });
      }
    } catch { /* Parent access is optional outside Streamlit. */ }
    this.reducedMotion.addEventListener('change', () => {
      if (this.reducedMotion.matches) this.finishDismiss();
    });
    document.addEventListener('keydown', event => {
      if (!this.active || event.key !== 'Tab') return;
      const targets = this.focusable();
      if (!targets.length) { event.preventDefault(); this.panel()?.focus({ preventScroll: true }); return; }
      const index = targets.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); targets.at(-1)!.focus({ preventScroll: true }); }
      else if (!event.shiftKey && (index < 0 || index === targets.length - 1)) {
        event.preventDefault(); targets[0].focus({ preventScroll: true });
      }
    });
    document.addEventListener('focusin', event => {
      if (this.active && !this.active.contains(event.target as Node) && !this.isAllowedOutsideControl(event.target)) {
        this.focusable()[0]?.focus({ preventScroll: true });
      }
    });
  }

  private panel() { return this.active?.querySelector<HTMLElement>('.ui-dialog-panel'); }
  private isAllowedOutsideControl(target: EventTarget | null) {
    return target instanceof HTMLElement && (target.id === 'vault-lock'
      || (this.active?.id === 'quick-add-backdrop' && target.id === 'nav-fab-quick-add'));
  }
  private measureNavigationHeight() {
    const nav = document.querySelector<HTMLElement>('#app-navigation nav');
    document.documentElement.style.setProperty('--ui-bottom-nav-height', `${nav?.getBoundingClientRect().height ?? 0}px`);
  }
  private syncNavigation(active: HTMLElement | null) {
    const navigation = document.getElementById('app-navigation');
    if (!navigation) return;
    const quickAdd = active?.id === 'quick-add-backdrop';
    navigation.classList.toggle('ui-quick-add-navigation', quickAdd);
    navigation.inert = !!active && !quickAdd;
    // The center FAB remains a close toggle; background destinations stay disabled.
    for (const button of navigation.querySelectorAll<HTMLButtonElement>('button')) {
      button.inert = quickAdd && button.id !== 'nav-fab-quick-add';
    }
    this.measureNavigationHeight();
  }
  private focusable() {
    const targets = Array.from(this.active?.querySelectorAll<HTMLElement>(controls) ?? [])
      .filter(element => element.getClientRects().length && !element.closest('[hidden], [inert]'));
    // The privacy Lock control stays available even while a form is open.
    const lock = document.getElementById('vault-lock');
    if (lock?.getClientRects().length) targets.push(lock);
    const fab = this.active?.id === 'quick-add-backdrop' ? document.getElementById('nav-fab-quick-add') : null;
    if (fab?.getClientRects().length && !fab.closest('[hidden], [inert]')) targets.push(fab);
    return targets;
  }

  private cancelDismiss() {
    if (this.pendingDismiss) window.clearTimeout(this.pendingDismiss.timer);
    this.pendingDismiss = null;
    document.querySelectorAll('#app-overlays .ui-bottom-sheet-closing')
      .forEach(layer => layer.classList.remove('ui-bottom-sheet-closing'));
  }
  private finishDismiss() {
    const pending = this.pendingDismiss;
    if (!pending) return;
    const stillActive = this.active?.id === pending.id && this.activeKey === pending.id;
    this.cancelDismiss();
    if (stillActive) pending.afterClose();
  }

  /** Keep this mounted sheet and its focus/scroll lock until its exit completes. */
  dismiss(id: string, afterClose: () => void): boolean {
    if (this.active?.id !== id) return false;
    if (this.pendingDismiss?.id === id) return true;
    this.cancelDismiss();
    if (this.reducedMotion.matches || document.documentElement.classList.contains('reduce-motion')) {
      afterClose();
      return true;
    }
    this.active.classList.add('ui-bottom-sheet-closing');
    this.pendingDismiss = { id, afterClose, timer: window.setTimeout(() => this.finishDismiss(), 200) };
    return true;
  }

  capture() {
    if (!this.active) this.pendingOpener = document.activeElement as HTMLElement | null;
    for (const layer of document.querySelectorAll<HTMLElement>('#app-overlays .ui-dialog-layer')) {
      // A hidden parent reports zero geometry; retain its last visible scroll position.
      if (layer.hidden) continue;
      const focus = document.activeElement as HTMLElement | null;
      const fields = Array.from(layer.querySelectorAll<HTMLElement>(controls));
      const previous = this.snapshots.get(layer.id);
      const drafts = new Map(previous?.drafts.map(draft => [draft.id, draft]) ?? []);
      for (const element of layer.querySelectorAll<Field>('[data-dialog-draft]')) {
        drafts.set(element.id, {
          id: element.id, value: element.value, ...(element instanceof HTMLInputElement ? { checked: element.checked } : {}),
        });
      }
      this.snapshots.set(layer.id, {
        scroll: Array.from(layer.querySelectorAll<HTMLElement>('.ui-dialog-panel, .ui-dialog-body')).map(element => element.scrollTop),
        details: Array.from(layer.querySelectorAll('details')).map(element => element.open),
        drafts: Array.from(drafts.values()),
        focus: focus && (layer.contains(focus) || (layer === this.active && this.isAllowedOutsideControl(focus))) ? {
          id: focus.id, action: focus.getAttribute('onclick'), index: fields.indexOf(focus),
          start: focus instanceof HTMLInputElement || focus instanceof HTMLTextAreaElement ? focus.selectionStart : null,
          end: focus instanceof HTMLInputElement || focus instanceof HTMLTextAreaElement ? focus.selectionEnd : null,
        } : previous?.focus,
      });
    }
  }

  sync(routeChanged: boolean) {
    const layers = Array.from(document.querySelectorAll<HTMLElement>('#app-overlays .ui-dialog-layer'));
    const next = layers.at(-1) ?? null;
    const key = next?.id ?? '';
    if (this.pendingDismiss && this.pendingDismiss.id !== key) this.cancelDismiss();
    if (next && !this.active) {
      this.opener = this.pendingOpener;
      this.openerAction = this.opener?.getAttribute('onclick') ?? null;
      this.backgroundScroll = window.scrollY;
    }
    this.active = next;
    for (const layer of layers) {
      const panel = layer.querySelector<HTMLElement>('.ui-dialog-panel')!;
      // Some older forms placed dialog semantics on the inner card.
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      if (!layer.hasAttribute('aria-labelledby') && panel.hasAttribute('aria-labelledby')) {
        layer.setAttribute('aria-labelledby', panel.getAttribute('aria-labelledby')!);
      }
      panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); panel.tabIndex = -1;
      layer.hidden = layer !== next;
      layer.inert = layer !== next;
      // A notification may replace the same sheet's markup; it must not replay entry.
      layer.classList.toggle('ui-dialog-retained', layer.id === 'quick-add-backdrop' && layer === next && key === this.activeKey);
      layer.classList.toggle('ui-bottom-sheet-closing', this.pendingDismiss?.id === layer.id);
      const saved = this.snapshots.get(layer.id);
      if (saved) {
        for (const draft of saved.drafts) {
          const field = document.getElementById(draft.id) as Field | null;
          if (field && layer.contains(field)) {
            field.value = draft.value;
            if (field instanceof HTMLInputElement && draft.checked !== undefined) field.checked = draft.checked;
          }
        }
        if (layer === next) {
          for (const field of layer.querySelectorAll<Field>('[data-dialog-draft-effect]')) {
            const effect = field.dataset.dialogDraftEffect;
            if (effect === 'input') field.dispatchEvent(new Event('input', { bubbles: true }));
            else if (effect) {
              const binding = (window as unknown as Record<string, unknown>)[effect];
              if (typeof binding === 'function') binding(field.value);
            }
          }
        }
        layer.querySelectorAll('details').forEach((element, i) => { element.open = saved.details[i] ?? element.open; });
        layer.querySelectorAll<HTMLElement>('.ui-dialog-panel, .ui-dialog-body').forEach((element, i) => { element.scrollTop = saved.scroll[i] ?? 0; });
      }
    }
    document.documentElement.classList.toggle('ui-dialog-open', !!next);
    const screen = document.getElementById('app-screen');
    if (screen) screen.inert = !!next;
    this.syncNavigation(next);
    const retained = new Set(layers.map(layer => layer.id));
    if (retained.has('custom-food-discard-backdrop')) retained.add('custom-food-modal-backdrop');
    if (retained.has('planner-overwrite-modal-backdrop')) retained.add('weekly-program-modal-backdrop');
    for (const savedKey of this.snapshots.keys()) {
      if (!retained.has(savedKey)) this.snapshots.delete(savedKey);
    }
    if (next) {
      const saved = this.snapshots.get(key)?.focus;
      const fields = this.focusable();
      const target = saved?.id ? fields.find(element => element.id === saved.id)
        : saved?.action ? fields.find(element => element.getAttribute('onclick') === saved.action)
          : saved ? fields[saved.index] : null;
      if (target) {
        target.focus({ preventScroll: true });
        if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && saved?.start !== null && saved?.end !== null) {
          try { target.setSelectionRange(saved!.start, saved!.end); } catch { /* Number/date fields have no text selection. */ }
        }
      } else if (key !== this.activeKey || (!next.contains(document.activeElement) && !this.isAllowedOutsideControl(document.activeElement))) {
        // Focus the title/close control rather than automatically opening the phone keyboard.
        (fields[0] ?? this.panel())?.focus({ preventScroll: true });
      }
    } else if (this.activeKey) {
      if (!routeChanged) {
        window.scrollTo({ top: this.backgroundScroll, behavior: 'instant' as ScrollBehavior });
        const opener = this.opener?.isConnected ? this.opener
          : this.opener?.id ? document.getElementById(this.opener.id)
            : this.openerAction ? Array.from(document.querySelectorAll<HTMLElement>('#app-screen button, #app-navigation button'))
              .find(element => element.getAttribute('onclick') === this.openerAction) : null;
        opener?.focus({ preventScroll: true });
      }
      this.opener = null; this.pendingOpener = null; this.openerAction = null; this.snapshots.clear();
    }
    this.activeKey = key;
    if (this.pendingDismiss && (this.reducedMotion.matches || document.documentElement.classList.contains('reduce-motion'))) {
      // A preference change can notify while rendering; finish after sync settles.
      const pending = this.pendingDismiss;
      queueMicrotask(() => { if (this.pendingDismiss === pending) this.finishDismiss(); });
    }
  }

  closeTop(): boolean {
    if (!this.active) return false;
    // Only call existing named close bindings. Never evaluate text as JavaScript.
    const match = /^window\.(\w+)\((false)?\)$/.exec(this.active.dataset.dialogClose ?? '');
    if (!match) return false;
    const binding = (window as unknown as Record<string, unknown>)[match[1]];
    if (typeof binding !== 'function') return false;
    binding(...(match[2] ? [false] : []));
    return true;
  }

  reset() {
    this.cancelDismiss();
    this.active = null; this.activeKey = ''; this.opener = null; this.pendingOpener = null; this.openerAction = null; this.snapshots.clear();
    document.documentElement.classList.remove('ui-dialog-open');
    for (const id of ['app-screen', 'app-navigation']) {
      const element = document.getElementById(id); if (element) element.inert = false;
    }
    this.syncNavigation(null);
  }
}

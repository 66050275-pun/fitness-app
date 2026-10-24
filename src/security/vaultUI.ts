import { tr, trHtml, getLanguage, setLanguage, onLanguageChange } from '../i18n/index.ts';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { createPrivateVault, unlockPrivateVault, getVaultAccessState, migratePassphraseVault, VaultAttemptError, VaultLockoutError, lockPrivateStorage,
  onSaveStatus, retryPrivateStorage, encryptedBackup, restoreEncryptedBackup } from '../services/privateStorage.ts';

interface NativeHaptics {
  impact(options: { style: 'LIGHT' }): Promise<void>;
  notification(options: { type: 'ERROR' }): Promise<void>;
}
const nativeHaptics = registerPlugin<NativeHaptics>('Haptics');
/** Native plugins are optional; browser vibration is a best-effort fallback. */
function passcodeFeedback(failed = false): void {
  const vibrate = () => { try { navigator.vibrate?.(failed ? [50, 40, 50] : 50); } catch { /* Optional feedback. */ } };
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')) {
    const feedback = failed ? nativeHaptics.notification({ type: 'ERROR' }) : nativeHaptics.impact({ style: 'LIGHT' });
    void feedback.catch(vibrate);
  } else vibrate();
}
const PIN_KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'],
  ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
] as const;

function privateError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const translated = tr(message);
  return getLanguage() === 'th' && translated === message && !/[\u0e00-\u0e7f]/.test(translated)
    ? tr('Could not access encrypted storage. Keep this tab open and try again.') : translated;
}

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `nutriai-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadEncryptedBackup() { download(await encryptedBackup()); }

/** The store is created only after decryption; recreated from durable data after every lock. */
export async function startPrivateApp(activate: () => void, deactivate: () => void) {
  const app = document.getElementById('app')!;
  // Before decryption, use the device theme; after locking, retain the current session theme.
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121e19' : '#effdf4');
  const bar = document.createElement('div');
  bar.className = 'vault-status-bar';
  bar.style.display = 'none';
  bar.innerHTML = `<span class="material-symbols-outlined vault-status-icon" aria-hidden="true">encrypted</span><span id="vault-save-state" role="status" aria-live="polite"></span><button type="button" id="vault-retry" hidden>${trHtml("Retry save")}</button><button type="button" id="vault-lock" aria-label="${trHtml("Lock NutriAI / ล็อกแอป")}"><span class="material-symbols-outlined" aria-hidden="true">lock</span>${trHtml("ล็อก")}</button>`;
  document.body.append(bar);
  const shield = document.createElement('div');
  shield.className = 'vault-shield';
  shield.style.display = 'none';
  shield.textContent = tr("ข้อมูลถูกซ่อนไว้ / Private screen hidden");
  document.body.append(shield);
  let active = false;
  let disposeGate: () => void = () => {};
  let gateGeneration = 0;
  let lastActivity = Date.now();
  let hiddenAt = 0;
  let locking = false;
  const inactivityMs = 5 * 60 * 1000;
  const saveLabel = bar.querySelector<HTMLElement>('#vault-save-state')!;
  const retry = bar.querySelector<HTMLButtonElement>('#vault-retry')!;
  let saveStatus = 'locked';
  const refreshLanguage = () => {
    saveLabel.textContent = saveStatus === 'saved' ? tr("Encrypted · Saved on this browser") : saveStatus === 'saving' ? tr("Encrypting · Saving…") : saveStatus === 'error' ? tr("NOT SAVED — retry before closing") : tr("Locked");
    retry.textContent = tr("Retry save");
    const lockButton = bar.querySelector<HTMLButtonElement>('#vault-lock')!;
    lockButton.setAttribute('aria-label', tr("Lock NutriAI / ล็อกแอป"));
    lockButton.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">lock</span>${trHtml("ล็อก")}`;
    if (!locking && !shield.childElementCount) shield.textContent = tr("ข้อมูลถูกซ่อนไว้ / Private screen hidden");
  };
  onLanguageChange(refreshLanguage);
  onSaveStatus(status => {
    saveStatus = status;
    refreshLanguage();
    retry.hidden = status !== 'error';
    bar.dataset.saveStatus = status;
  });
  retry.onclick = () => { void retryPrivateStorage().catch(() => alert(tr("ยังบันทึกไม่ได้ กรุณาสำรองข้อมูลก่อนปิดแท็บ / Save failed. Export before closing."))); };
  const lock = async () => {
    if (!active || locking) return;
    locking = true; shield.style.display = 'grid';
    // Cancel delayed UI actions before awaiting encryption/storage flush.
    document.dispatchEvent(new Event('nutriai:lock-start'));
    try {
      await lockPrivateStorage();
      deactivate(); active = false; app.replaceChildren(); bar.style.display = 'none'; app.classList.remove('vault-open');
      shield.style.display = 'none'; await gate();
    } catch {
      shield.replaceChildren();
      const message = document.createElement('div');
      message.textContent = tr("ยังล็อกไม่ได้ เพราะมีข้อมูลที่ยังบันทึกไม่สำเร็จ / Lock pending: unsaved changes.");
      const retryLock = document.createElement('button'); retryLock.textContent = tr("Retry save and lock");
      retryLock.onclick = async () => { try { await retryPrivateStorage(); shield.style.display = 'none'; await lock(); } catch { /* Keep protected screen and recovery buttons. */ } };
      const exportButton = document.createElement('button'); exportButton.textContent = tr("Export encrypted backup");
      exportButton.onclick = () => { void downloadEncryptedBackup().catch(() => alert(tr("Backup failed. Keep this tab open."))); };
      const backup = document.createElement('button'); backup.textContent = tr("Return to app to recover");
      backup.onclick = () => { shield.style.display = 'none'; lastActivity = Date.now(); };
      shield.append(message, retryLock, exportButton, backup);
    } finally { locking = false; document.dispatchEvent(new Event('nutriai:lock-end')); }
  };
  bar.querySelector<HTMLButtonElement>('#vault-lock')!.onclick = () => { void lock(); };
  for (const event of ['pointerdown', 'keydown', 'input', 'touchstart']) {
    document.addEventListener(event, () => { if (active && !hiddenAt) lastActivity = Date.now(); }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { hiddenAt = Date.now(); shield.textContent = tr("ข้อมูลถูกซ่อนไว้ / Private screen hidden"); shield.style.display = 'grid'; }
    else {
      if (hiddenAt && Date.now() - hiddenAt >= inactivityMs) void lock();
      else if (!locking) shield.style.display = 'none';
      hiddenAt = 0;
    }
  });
  setInterval(() => { if (active && Date.now() - (hiddenAt || lastActivity) >= inactivityMs) void lock(); }, 1000);
  window.addEventListener('beforeunload', event => {
    if (saveStatus === 'saving' || saveStatus === 'error') { event.preventDefault(); event.returnValue = ''; }
  });

  async function gate() {
    disposeGate();
    const generation = ++gateGeneration;
    let access: Awaited<ReturnType<typeof getVaultAccessState>>;
    try { access = await getVaultAccessState(); }
    catch (error) {
      if (generation !== gateGeneration) return;
      app.innerHTML = `<main class="vault-gate"><div class="vault-brand"><span class="vault-brand-mark material-symbols-outlined" aria-hidden="true">nutrition</span><span>NutriAI</span></div><section class="vault-card"><span class="vault-feature-icon material-symbols-outlined" aria-hidden="true">lock</span><h1>${trHtml("Private storage unavailable")}</h1><p>${trHtml(privateError(error))}</p><p>${trHtml("แอปจะไม่บันทึกข้อมูลส่วนตัวแบบไม่เข้ารหัส กรุณาเปิดผ่าน HTTPS และอนุญาต browser storage")}</p></section></main>`;
      return;
    }
    if (generation !== gateGeneration) return;
    let digits = '';
    let firstPin = '';
    let oldPassphrase = '';
    let confirmStep = false;
    let busy = false;
    let disposed = false;
    let legacyStep = access.requiresPassphraseMigration;
    app.innerHTML = `<main class="vault-gate vault-pin-gate">
      <div class="vault-brand"><span class="vault-brand-mark material-symbols-outlined" aria-hidden="true">nutrition</span><div><strong>NutriAI</strong><span>${trHtml("Nutrition & Fitness")}</span></div></div>
      <section class="vault-card vault-pin-card" aria-labelledby="vault-heading">
        <label class="vault-language" for="vault-language">${trHtml("Language")} <select id="vault-language" class="ui-field vault-input"><option value="en" ${getLanguage() === 'en' ? 'selected' : ''}>${trHtml("English")}</option><option value="th" ${getLanguage() === 'th' ? 'selected' : ''}>${trHtml("Thai")}</option></select></label>
        <span class="vault-feature-icon vault-pin-lock material-symbols-outlined" aria-hidden="true">${access.exists ? 'lock' : 'shield_lock'}</span>
        <h1 id="vault-heading"></h1>
        <p class="vault-subtitle">${access.exists ? trHtml("Unlock NutriAI") : trHtml("Protect your NutriAI data")}</p>
        <div id="vault-pin-panel">
          <div id="vault-pin-indicators" class="vault-pin-indicators" role="img" aria-label="${trHtml("{0} of 6 digits entered", 0)}">${Array.from({ length: 6 }, () => '<span class="vault-pin-dot h-3.5 w-3.5 rounded-full border border-slate-400" aria-hidden="true"></span>').join('')}</div>
          <p id="vault-pin-progress" class="sr-only" role="status" aria-live="polite"></p>
          <div id="vault-keypad" class="vault-keypad grid grid-cols-3" role="group" aria-label="${trHtml("Passcode keypad")}">
            ${PIN_KEYS.map(([digit, letters]) => `<button type="button" data-vault-digit="${digit}" class="vault-pin-key h-[72px] w-[72px] rounded-full border border-slate-300/20 active:bg-white/20 transition" aria-label="${digit}"><span class="vault-pin-number">${digit}</span><span class="vault-pin-letters" aria-hidden="true">${letters || '&nbsp;'}</span></button>`).join('')}
            <span aria-hidden="true"></span>
            <button type="button" data-vault-digit="0" class="vault-pin-key h-[72px] w-[72px] rounded-full border border-slate-300/20 active:bg-white/20 transition" aria-label="0"><span class="vault-pin-number">0</span></button>
            <button type="button" id="vault-delete" class="vault-pin-key vault-pin-delete rounded-full transition" aria-label="${trHtml("Delete last digit")}"><span class="material-symbols-outlined" aria-hidden="true">backspace</span></button>
          </div>
          <button id="vault-start-over" type="button" class="vault-pin-restart">${trHtml("Start over")}</button>
        </div>
        <form id="vault-legacy-form" class="vault-form" hidden>
          <p>${trHtml("Enter your current passphrase, then choose a six-digit passcode. Your encrypted data will be preserved.")}</p>
          <label for="vault-legacy-password">${trHtml("Current passphrase")}</label>
          <input id="vault-legacy-password" type="password" autocomplete="current-password" required class="ui-field vault-input" aria-describedby="vault-error">
          <button type="submit" class="ui-primary-button">${trHtml("Continue to passcode")}</button>
        </form>
        <p id="vault-busy" class="vault-pin-feedback" role="status" aria-live="polite"></p>
        <p id="vault-error" role="alert" class="vault-error vault-pin-feedback"></p>
        <p id="vault-lockout" class="vault-pin-feedback" role="status" aria-live="polite"></p>
        <p class="vault-pin-note">${trHtml("ข้อมูลส่วนตัวเก็บแบบเข้ารหัสใน browser นี้ ไม่มีบัญชีหรือฐานข้อมูลผู้ใช้บนเซิร์ฟเวอร์")}</p>
        <div class="vault-security-note"><span class="material-symbols-outlined" aria-hidden="true">encrypted</span><span>${trHtml("ขณะปลดล็อก ผู้ที่ใช้เครื่องนี้เข้าถึงข้อมูลได้ กดล็อกเมื่อใช้เสร็จ แอปล็อกหลังไม่มีการใช้งาน 5 นาที")}</span></div>
      </section>
      <details class="vault-help-card"><summary>${trHtml("การสำรองข้อมูลและความเป็นส่วนตัว")}</summary><div>
        <p>${trHtml("There is no passcode recovery. Keep an encrypted backup before clearing browser storage or changing devices.")}</p>
        <p>${trHtml("Choose a passcode you do not use elsewhere. Six-digit passcodes have fewer possible combinations than long passphrases.")}</p>
        <p>${trHtml("Local lockouts cannot prevent offline guessing of an exported vault.")}</p>
        <p>${trHtml("การล็อกจะยกเลิกงานที่ยังไม่ได้กดบันทึก ขณะปลดล็อก สคริปต์ของแอปเข้าถึงข้อมูลได้")}</p>
        ${access.exists ? '' : `<p>${trHtml("ข้อมูลเดิมใน browser นี้จะย้ายไปเก็บแบบเข้ารหัสเมื่อสร้าง vault")}</p>`}
        <p>${trHtml("Public repo contains application code, not your browser vault. Hosting services still receive normal page requests and network metadata.")}</p>
      </div></details>
      ${access.exists ? '' : `<label class="vault-restore-card" for="vault-restore"><span class="material-symbols-outlined" aria-hidden="true">restore</span><strong>${trHtml("กู้จากไฟล์สำรองเข้ารหัส")}</strong><input id="vault-restore" type="file" accept="application/json,.json" hidden></label>`}
    </main>`;
    const heading = app.querySelector<HTMLElement>('#vault-heading')!;
    const pinPanel = app.querySelector<HTMLElement>('#vault-pin-panel')!;
    const indicators = app.querySelector<HTMLElement>('#vault-pin-indicators')!;
    const progress = app.querySelector<HTMLElement>('#vault-pin-progress')!;
    const keypad = app.querySelector<HTMLElement>('#vault-keypad')!;
    const keypadButtons = Array.from(keypad.querySelectorAll<HTMLButtonElement>('button'));
    const legacyForm = app.querySelector<HTMLFormElement>('#vault-legacy-form')!;
    const legacyInput = app.querySelector<HTMLInputElement>('#vault-legacy-password')!;
    const languagePicker = app.querySelector<HTMLSelectElement>('#vault-language')!;
    const startOver = app.querySelector<HTMLButtonElement>('#vault-start-over')!;
    const errorLabel = app.querySelector<HTMLElement>('#vault-error')!;
    const lockoutLabel = app.querySelector<HTMLElement>('#vault-lockout')!;
    const busyLabel = app.querySelector<HTMLElement>('#vault-busy')!;
    const restore = app.querySelector<HTMLInputElement>('#vault-restore');
    const isLockedOut = () => access.lockedUntil > Date.now();
    function refresh() {
      if (disposed) return;
      const locked = isLockedOut();
      heading.textContent = legacyStep ? tr('Update your existing vault') : confirmStep ? tr('Re-enter your passcode to confirm') : access.exists && !access.requiresPassphraseMigration ? tr('Enter your passcode to unlock') : tr('Enter a 6-digit passcode');
      pinPanel.hidden = legacyStep;
      legacyForm.hidden = !legacyStep;
      indicators.setAttribute('aria-label', tr('{0} of 6 digits entered', digits.length));
      for (const [index, dot] of Array.from(indicators.children).entries()) dot.classList.toggle('vault-pin-dot-filled', index < digits.length);
      progress.textContent = tr('{0} of 6 digits entered', digits.length);
      for (const button of keypadButtons) button.disabled = busy || locked;
      legacyInput.disabled = busy || locked;
      legacyForm.querySelector<HTMLButtonElement>('button')!.disabled = busy || locked;
      languagePicker.disabled = busy;
      startOver.hidden = !confirmStep && !access.requiresPassphraseMigration;
      startOver.disabled = busy;
      if (restore) restore.disabled = busy;
      const seconds = Math.max(0, Math.ceil((access.lockedUntil - Date.now()) / 1000));
      lockoutLabel.textContent = seconds ? tr('Try again in {0}.', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`) : '';
    }
    function shake(message: string) {
      errorLabel.textContent = message;
      const target = legacyStep ? legacyForm : indicators;
      target.classList.remove('vault-pin-shake');
      void target.offsetWidth;
      target.classList.add('vault-pin-shake');
      passcodeFeedback(true);
    }
    function clearSecrets() { digits = ''; firstPin = ''; oldPassphrase = ''; legacyInput.value = ''; }
    function reset() {
      clearSecrets(); confirmStep = false; legacyStep = access.requiresPassphraseMigration;
      errorLabel.textContent = ''; refresh();
      if (legacyStep) legacyInput.focus();
    }
    async function submitPin(pin: string) {
      if (busy || isLockedOut() || disposed) return;
      const migration = access.requiresPassphraseMigration;
      busy = true;
      errorLabel.textContent = '';
      busyLabel.textContent = migration ? tr('Upgrading your encrypted vault…') : access.exists ? tr('Verifying passcode…') : tr('Creating your encrypted vault…');
      refresh();
      try {
        if (migration) await migratePassphraseVault(oldPassphrase, pin);
        else if (access.exists) await unlockPrivateVault(pin);
        else await createPrivateVault(pin);
        if (disposed) return;
        clearSecrets(); disposeGate();
        active = true; lastActivity = Date.now(); hiddenAt = document.hidden ? Date.now() : 0;
        if (document.hidden) { shield.textContent = tr('ข้อมูลถูกซ่อนไว้ / Private screen hidden'); shield.style.display = 'grid'; }
        app.classList.add('vault-open'); bar.style.display = 'flex'; activate();
      } catch (error) {
        if (disposed) return;
        clearSecrets(); confirmStep = false;
        if (error instanceof VaultAttemptError || error instanceof VaultLockoutError) {
          access.failedAttempts = error.failedAttempts;
          access.lockedUntil = error.lockedUntil;
        }
        access = await getVaultAccessState().catch(() => access);
        if (disposed) return;
        legacyStep = access.requiresPassphraseMigration;
        const remaining = Math.max(0, (access.failedAttempts < 3 ? 3 : 5) - access.failedAttempts);
        shake(error instanceof VaultAttemptError && !isLockedOut()
          ? tr(migration ? 'Incorrect passphrase. {0} attempts before the next lockout.' : 'Incorrect passcode. {0} attempts before the next lockout.', remaining)
          : privateError(error));
      } finally {
        busy = false;
        if (!disposed) { busyLabel.textContent = ''; refresh(); }
      }
    }
    function enterDigit(digit: string) {
      if (busy || legacyStep || isLockedOut() || disposed || digits.length >= 6) return;
      errorLabel.textContent = ''; passcodeFeedback();
      digits += digit; refresh();
      if (digits.length !== 6) return;
      if (!access.exists || access.requiresPassphraseMigration) {
        if (!confirmStep) { firstPin = digits; digits = ''; confirmStep = true; refresh(); return; }
        if (digits !== firstPin) {
          digits = ''; firstPin = ''; confirmStep = false;
          shake(tr('Your passcodes did not match. Enter a new passcode.')); refresh(); return;
        }
      }
      const pin = digits;
      firstPin = '';
      void submitPin(pin);
    }
    function deleteDigit() {
      if (busy || legacyStep || isLockedOut() || disposed) return;
      if (digits) { digits = digits.slice(0, -1); passcodeFeedback(); refresh(); }
    }
    for (const button of keypadButtons) {
      const digit = button.dataset.vaultDigit;
      button.onclick = () => { if (digit !== undefined) enterDigit(digit); else deleteDigit(); };
    }
    startOver.onclick = reset;
    languagePicker.onchange = event => { setLanguage((event.target as HTMLSelectElement).value); void gate(); };
    legacyForm.onsubmit = event => {
      event.preventDefault();
      if (busy || isLockedOut() || !legacyInput.value) return;
      oldPassphrase = legacyInput.value; legacyInput.value = '';
      legacyStep = false; digits = ''; firstPin = ''; confirmStep = false;
      errorLabel.textContent = ''; refresh(); keypadButtons[0]?.focus();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (legacyStep || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLSelectElement) return;
      if (/^\d$/.test(event.key)) { event.preventDefault(); enterDigit(event.key); }
      else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); deleteDigit(); }
    };
    document.addEventListener('keydown', keyboard);
    // Countdown uses only local metadata; switching tabs refreshes authoritative state.
    let metadataRefreshing = false;
    const refreshMetadata = () => {
      if (busy || metadataRefreshing || disposed) return;
      metadataRefreshing = true;
      void getVaultAccessState().then(next => {
        if (disposed || busy) return;
        if (next.exists !== access.exists || next.requiresPassphraseMigration !== access.requiresPassphraseMigration) { void gate(); return; }
        access = next; refresh();
      }).catch(() => {}).finally(() => { metadataRefreshing = false; });
    };
    const visibility = () => {
      if (document.hidden && !busy) reset();
      else if (!document.hidden) refreshMetadata();
    };
    let refreshedExpiry = 0;
    const countdown = window.setInterval(() => {
      if (access.lockedUntil > 0 && access.lockedUntil <= Date.now() && refreshedExpiry !== access.lockedUntil) {
        refreshedExpiry = access.lockedUntil; refreshMetadata();
      }
      refresh();
    }, 1000);
    window.addEventListener('focus', refreshMetadata);
    document.addEventListener('visibilitychange', visibility);
    disposeGate = () => {
      disposed = true; clearSecrets();
      clearInterval(countdown); document.removeEventListener('keydown', keyboard);
      window.removeEventListener('focus', refreshMetadata);
      document.removeEventListener('visibilitychange', visibility);
    };
    if (restore) restore.onchange = async () => {
      const file = restore.files?.[0]; if (!file || busy) return;
      busy = true; errorLabel.textContent = ''; busyLabel.textContent = tr('Restoring encrypted backup…'); refresh();
      try {
        if (file.size > 30 * 1024 * 1024) throw new Error(tr('Backup file is too large.'));
        await restoreEncryptedBackup(await file.text()); await gate();
      } catch (error) { if (!disposed) errorLabel.textContent = privateError(error); }
      finally { busy = false; if (!disposed) { busyLabel.textContent = ''; refresh(); } }
    };
    refresh();
  }
  await gate();
}

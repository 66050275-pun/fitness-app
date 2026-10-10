import { createPrivateVault, unlockPrivateVault, vaultExists, lockPrivateStorage,
  onSaveStatus, retryPrivateStorage, encryptedBackup, restoreEncryptedBackup } from '../services/privateStorage.ts';
import { escapeHtml } from '../utils/sanitize.ts';

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
  bar.innerHTML = '<span class="material-symbols-outlined vault-status-icon" aria-hidden="true">encrypted</span><span id="vault-save-state" role="status" aria-live="polite"></span><button type="button" id="vault-retry" hidden>Retry save</button><button type="button" id="vault-lock" aria-label="Lock NutriAI / ล็อกแอป"><span class="material-symbols-outlined" aria-hidden="true">lock</span>ล็อก</button>';
  document.body.append(bar);
  const shield = document.createElement('div');
  shield.className = 'vault-shield';
  shield.style.display = 'none';
  shield.textContent = 'ข้อมูลถูกซ่อนไว้ / Private screen hidden';
  document.body.append(shield);
  let active = false;
  let lastActivity = Date.now();
  let hiddenAt = 0;
  let locking = false;
  const inactivityMs = 5 * 60 * 1000;
  const saveLabel = bar.querySelector<HTMLElement>('#vault-save-state')!;
  const retry = bar.querySelector<HTMLButtonElement>('#vault-retry')!;
  onSaveStatus(status => {
    saveLabel.textContent = status === 'saved' ? 'Encrypted · Saved on this browser' : status === 'saving' ? 'Encrypting · Saving…' : status === 'error' ? 'NOT SAVED — retry before closing' : 'Locked';
    retry.hidden = status !== 'error';
    bar.dataset.saveStatus = status;
  });
  retry.onclick = () => { void retryPrivateStorage().catch(() => alert('ยังบันทึกไม่ได้ กรุณาสำรองข้อมูลก่อนปิดแท็บ / Save failed. Export before closing.')); };
  const lock = async () => {
    if (!active || locking) return;
    locking = true; shield.style.display = 'grid';
    try {
      await lockPrivateStorage();
      deactivate(); active = false; app.replaceChildren(); bar.style.display = 'none'; app.classList.remove('vault-open');
      shield.style.display = 'none'; await gate();
    } catch {
      shield.replaceChildren();
      const message = document.createElement('div');
      message.textContent = 'ยังล็อกไม่ได้ เพราะมีข้อมูลที่ยังบันทึกไม่สำเร็จ / Lock pending: unsaved changes.';
      const retryLock = document.createElement('button'); retryLock.textContent = 'Retry save and lock';
      retryLock.onclick = async () => { try { await retryPrivateStorage(); shield.style.display = 'none'; await lock(); } catch { /* Keep protected screen and recovery buttons. */ } };
      const exportButton = document.createElement('button'); exportButton.textContent = 'Export encrypted backup';
      exportButton.onclick = () => { void downloadEncryptedBackup().catch(() => alert('Backup failed. Keep this tab open.')); };
      const backup = document.createElement('button'); backup.textContent = 'Return to app to recover';
      backup.onclick = () => { shield.style.display = 'none'; lastActivity = Date.now(); };
      shield.append(message, retryLock, exportButton, backup);
    } finally { locking = false; }
  };
  bar.querySelector<HTMLButtonElement>('#vault-lock')!.onclick = () => { void lock(); };
  for (const event of ['pointerdown', 'keydown', 'input', 'touchstart']) {
    document.addEventListener(event, () => { if (active && !hiddenAt) lastActivity = Date.now(); }, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { hiddenAt = Date.now(); shield.textContent = 'ข้อมูลถูกซ่อนไว้ / Private screen hidden'; shield.style.display = 'grid'; }
    else {
      if (hiddenAt && Date.now() - hiddenAt >= inactivityMs) void lock();
      else if (!locking) shield.style.display = 'none';
      hiddenAt = 0;
    }
  });
  setInterval(() => { if (active && Date.now() - (hiddenAt || lastActivity) >= inactivityMs) void lock(); }, 1000);
  window.addEventListener('beforeunload', event => {
    if (saveLabel.textContent?.includes('Saving') || saveLabel.textContent?.includes('NOT SAVED')) { event.preventDefault(); event.returnValue = ''; }
  });

  async function gate() {
    let exists: boolean;
    try { exists = await vaultExists(); }
    catch (error) {
      app.innerHTML = `<main class="vault-gate"><div class="vault-brand"><span class="vault-brand-mark material-symbols-outlined" aria-hidden="true">nutrition</span><span>NutriAI</span></div><section class="vault-card"><span class="vault-feature-icon material-symbols-outlined" aria-hidden="true">lock</span><h1>Private storage unavailable</h1><p>${escapeHtml((error as Error).message)}</p><p>แอปจะไม่บันทึกข้อมูลส่วนตัวแบบไม่เข้ารหัส กรุณาเปิดผ่าน HTTPS และอนุญาต browser storage</p></section></main>`;
      return;
    }
    app.innerHTML = `<main class="vault-gate">
      <div class="vault-brand"><span class="vault-brand-mark material-symbols-outlined" aria-hidden="true">nutrition</span><div><strong>NutriAI</strong><span>Nutrition &amp; Fitness</span></div></div>
      <section class="vault-card" aria-labelledby="vault-heading">
        <div class="vault-heading-row"><span class="vault-feature-icon material-symbols-outlined" aria-hidden="true">${exists ? 'lock' : 'shield_lock'}</span><span class="vault-badge">เก็บข้อมูลในเครื่อง</span></div>
        <h1 id="vault-heading">${exists ? 'ยินดีต้อนรับกลับ' : 'เริ่มต้นอย่างเป็นส่วนตัว'}</h1>
        <p class="vault-subtitle">${exists ? 'Unlock NutriAI' : 'Protect your NutriAI data'}</p>
        <p>ข้อมูลส่วนตัวเก็บแบบเข้ารหัสใน browser นี้ ไม่มีบัญชีหรือฐานข้อมูลผู้ใช้บนเซิร์ฟเวอร์</p>
        <form id="vault-form" class="vault-form">
          <label for="vault-password">Passphrase / รหัสผ่าน</label>
          <input id="vault-password" type="password" autocomplete="${exists ? 'current-password' : 'new-password'}" required ${exists ? '' : 'minlength="12"'} aria-describedby="vault-passphrase-help vault-error" class="vault-input">
          <p id="vault-passphrase-help" class="vault-field-help">${exists ? 'ใช้รหัสผ่านที่ตั้งไว้ใน browser นี้' : 'ใช้รหัสผ่านเฉพาะอย่างน้อย 12 ตัวอักษร เช่น วลียาวที่คุณจำได้'}</p>
          ${exists ? '' : '<label for="vault-confirm">Confirm / ยืนยันรหัสผ่าน</label><input id="vault-confirm" type="password" autocomplete="new-password" required class="vault-input">'}
          <label class="vault-password-toggle"><input id="vault-password-visible" type="checkbox">แสดงรหัสผ่าน</label>
          <p id="vault-error" role="alert" class="vault-error"></p>
          <button class="ui-primary-button" type="submit">${exists ? 'Unlock / ปลดล็อก' : 'Create encrypted vault / เริ่มใช้งาน'}</button>
        </form>
        <div class="vault-security-note"><span class="material-symbols-outlined" aria-hidden="true">encrypted</span><span>ขณะปลดล็อก ผู้ที่ใช้เครื่องนี้เข้าถึงข้อมูลได้ กดล็อกเมื่อใช้เสร็จ แอปล็อกหลังไม่มีการใช้งาน 5 นาที</span></div>
      </section>
      <details class="vault-help-card"><summary>การสำรองข้อมูลและความเป็นส่วนตัว</summary><div>
        <p>ไม่มีบริการกู้รหัสผ่าน ลืมรหัส = เปิดข้อมูลไม่ได้ สำรองไฟล์เข้ารหัสจาก Data &amp; Privacy ก่อนล้าง browser เปลี่ยน URL หรือเปลี่ยนโทรศัพท์ ข้อมูลไม่ซิงก์ข้ามเครื่องโดยอัตโนมัติ</p>
        <p>การล็อกจะยกเลิกงานที่ยังไม่ได้กดบันทึก ขณะปลดล็อก สคริปต์ของแอปเข้าถึงข้อมูลได้</p>
        ${exists ? '' : '<p>ข้อมูลเดิมใน browser นี้จะย้ายไปเก็บแบบเข้ารหัสเมื่อสร้าง vault</p>'}
        <p>Public repo contains application code, not your browser vault. Hosting services still receive normal page requests and network metadata.</p>
      </div></details>
      ${exists ? '' : '<label class="vault-restore-card" for="vault-restore"><span class="material-symbols-outlined" aria-hidden="true">restore</span><strong>กู้จากไฟล์สำรองเข้ารหัส</strong><input id="vault-restore" type="file" accept="application/json,.json"></label>'}
    </main>`;
    document.getElementById('vault-password-visible')!.onchange = event => {
      const visible = (event.target as HTMLInputElement).checked;
      for (const id of ['vault-password', 'vault-confirm']) {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.type = visible ? 'text' : 'password';
      }
    };
    const form = document.getElementById('vault-form') as HTMLFormElement;
    form.onsubmit = async event => {
      event.preventDefault();
      const input = document.getElementById('vault-password') as HTMLInputElement;
      const confirm = document.getElementById('vault-confirm') as HTMLInputElement | null;
      const button = form.querySelector<HTMLButtonElement>('button')!;
      const error = document.getElementById('vault-error')!;
      if (confirm && confirm.value !== input.value) { error.textContent = 'รหัสผ่านไม่ตรงกัน / Passphrases do not match.'; return; }
      button.disabled = true; button.textContent = 'กำลังเปิดข้อมูล…'; error.textContent = '';
      try {
        if (exists) await unlockPrivateVault(input.value); else await createPrivateVault(input.value);
        input.value = ''; if (confirm) confirm.value = '';
        active = true; lastActivity = Date.now(); hiddenAt = 0;
        app.classList.add('vault-open'); bar.style.display = 'flex'; activate();
      } catch (err) {
        error.textContent = (err as Error).message;
        // Migration may already be encrypted and durable; next attempt must unlock it.
        exists = await vaultExists().catch(() => exists);
        button.disabled = false; button.textContent = exists ? 'Unlock / ปลดล็อก' : 'Create encrypted vault / เริ่มใช้งาน';
      }
    };
    const restore = document.getElementById('vault-restore') as HTMLInputElement | null;
    if (restore) restore.onchange = async () => {
      const file = restore.files?.[0]; if (!file) return;
      try {
        if (file.size > 30 * 1024 * 1024) throw new Error('Backup file is too large.');
        await restoreEncryptedBackup(await file.text()); await gate();
      } catch (err) { document.getElementById('vault-error')!.textContent = (err as Error).message; }
    };
  }
  await gate();
}

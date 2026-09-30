import { brand, fmtTime, schedule } from '../content/brand';

/**
 * No fake checkout. The form only composes a WhatsApp message to the real
 * reservation line; the guest sends it, the team confirms availability.
 */
export function reserveForm() {
  const form = document.querySelector<HTMLFormElement>('[data-manifest]');
  if (!form) return;
  const date = form.querySelector<HTMLInputElement>('#f-date')!;
  const count = form.querySelector<HTMLInputElement>('#f-count')!;
  const name = form.querySelector<HTMLInputElement>('#f-name')!;
  const preview = form.querySelector<HTMLElement>('[data-preview]')!;
  const note = form.querySelector<HTMLElement>('[data-manifest-note]')!;
  const defaultNote = note.textContent;

  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  date.min = iso(today);
  date.value = iso(today);

  const longDate = (v: string) => {
    const [y, m, d] = v.split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(y, m - 1, d));
  };

  const message = () => {
    const n = Math.max(1, Math.min(60, Number(count.value) || 1));
    const main = form.querySelector<HTMLInputElement>('input[name="main"]:checked')?.value ?? '';
    const when = date.value === iso(today) ? `bu gece (${longDate(date.value)})` : `${longDate(date.value)} gecesi`;
    const lines = [
      `Merhaba, ${when} ${brand.vessel} için ${n} kişilik yer ayırtmak istiyorum.`,
      `Biniş ${fmtTime(schedule.boarding)}, ${brand.pier}.`,
    ];
    if (main) lines.push(`Ana yemek tercihi: ${main}.`);
    if (name.value.trim()) lines.push(`İsim: ${name.value.trim()}`);
    return lines.join('\n');
  };

  const render = () => {
    preview.textContent = `“${message().split('\n')[0]}”`;
  };

  form.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const n = (Number(count.value) || 1) + Number(btn.dataset.step);
      count.value = String(Math.max(1, Math.min(60, n)));
      render();
    }),
  );
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!date.value || date.value < date.min) {
      note.textContent = 'Lütfen bugün ya da ileri bir tarih seçin.';
      note.classList.add('is-error');
      date.focus();
      return;
    }
    note.classList.remove('is-error');
    const url = `${brand.whatsapp}?text=${encodeURIComponent(message())}`;
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
    note.textContent = 'WhatsApp açıldı. Mesajı gönderdiğinizde talebiniz ekibe ulaşır; yer durumu oradan teyit edilir.';
    window.setTimeout(() => (note.textContent = defaultNote), 14000);
  });
}

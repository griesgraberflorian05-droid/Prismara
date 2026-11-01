// Lautstärke-Regler im Spiel-Design: Holzleiste mit Füllung und Goldschieber, Musik und Effekte getrennt,
// in den Einstellungen und im Pausenmenü.
import { getSettings, updateSettings } from '../settings.js';
import { play } from '../game/sound.js';
import { icon } from './icons.js';

export function volumeHtml() {
  const s = getSettings();
  const row = (id, ic, label, v) => { const p = Math.round(v * 100); return `<label class="vol-row"><span>${icon(ic)} ${label}</span><input type="range" id="${id}" min="0" max="100" step="5" value="${p}" style="--v:${p}%" aria-label="${label} Lautstärke"><output>${p}</output></label>`; };
  return row('vol-music', 'note', 'Musik', s.musicVolume ?? 0.5) + row('vol-sfx', 'sound', 'Effekte', s.sfxVolume ?? 0.7);
}

export function bindVolume(root) {
  const bind = (id, key) => {
    const input = root.querySelector(`#${id}`);
    input.addEventListener('input', () => {
      updateSettings({ [key]: input.value / 100 });
      input.style.setProperty('--v', `${input.value}%`);
      input.nextElementSibling.textContent = input.value;
    });
    if (key === 'sfxVolume') input.addEventListener('change', () => play('ui')); // Probeton beim Loslassen
  };
  bind('vol-music', 'musicVolume'); bind('vol-sfx', 'sfxVolume');
}

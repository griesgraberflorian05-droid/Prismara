// Zentrale Stelle für die Laufzeit-Konfiguration.
// tools/serve.py liest PRISMARA_ENV (Prozessumgebung oder .env) und liefert sie als /env.js aus.
// Ohne Server (statische GitHub-Pages-Seite) gilt automatisch "production".
// Kein Build-Werkzeug, daher kein Präfix wie VITE_ nötig.
const cfg = window.PRISMARA_CONFIG || { env: 'production', source: 'statisch' };

export const ENV = cfg.env;
export const ENV_SOURCE = cfg.source;
export const IS_DEV = ENV === 'development';

const LABELS = { development: 'Development', production: 'Production', test: 'Test' };
export const ENV_LABEL = LABELS[ENV] || ENV;

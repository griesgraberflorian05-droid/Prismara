// Statische GitHub-Pages-Version. Der lokale Dev-Server kann diese Werte weiter setzen.
const cfg = window.PRISMARA_CONFIG || { env: 'production', source: 'statisch', activity: false };

export const ENV = cfg.env;
export const ENV_SOURCE = cfg.source;
export const IS_DEV = ENV === 'development';

const LABELS = { development: 'Development', production: 'Production', test: 'Test' };
export const ENV_LABEL = LABELS[ENV] || ENV;

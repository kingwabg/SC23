const scriptLoadCache = new Map();

const normalizeBaseUrl = (value = '') => value.replace(/\/+$/, '');

const WEBHWP_BASE_PATH = '/webhwpctrl';

const clipBeforeMatch = (value, pattern) => {
  const matchIndex = value.indexOf(pattern);
  if (matchIndex === -1) return '';
  return value.slice(0, matchIndex);
};

const ensureWebHwpBaseUrl = (value = '') => {
  if (!value) return '';

  const normalized = normalizeBaseUrl(value.replace(/\\/g, '/'));
  if (!normalized) return '';

  if (normalized.includes(`${WEBHWP_BASE_PATH}/js/`)) {
    return clipBeforeMatch(normalized, `${WEBHWP_BASE_PATH}/js/`) + WEBHWP_BASE_PATH;
  }

  if (normalized.endsWith(WEBHWP_BASE_PATH)) {
    return normalized;
  }

  if (normalized.includes(WEBHWP_BASE_PATH)) {
    return clipBeforeMatch(normalized, WEBHWP_BASE_PATH) + WEBHWP_BASE_PATH;
  }

  return `${normalized}${WEBHWP_BASE_PATH}`;
};

const deriveServiceUrlFromScriptUrl = (scriptUrl = '') => {
  if (!scriptUrl) return '';
  return ensureWebHwpBaseUrl(scriptUrl);
};

const ensureAbsoluteUrl = (baseUrl, nextPath) => {
  if (!nextPath) return '';
  if (/^https?:\/\//i.test(nextPath)) return nextPath;
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = nextPath.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

const loadScript = (src) => {
  if (!src) return Promise.reject(new Error('script_src_missing'));
  if (scriptLoadCache.has(src)) return scriptLoadCache.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-webhwp-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve(src);
      return;
    }

    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.webhwpSrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve(src);
    };
    script.onerror = () => reject(new Error(`script_load_failed:${src}`));

    if (!existing) {
      document.head.appendChild(script);
    }
  });

  scriptLoadCache.set(src, promise);
  return promise;
};

export const buildWebHwpRuntimeUrls = ({ serviceUrl, scriptUrl }) => {
  const resolvedServiceUrl = ensureWebHwpBaseUrl(serviceUrl || deriveServiceUrlFromScriptUrl(scriptUrl));
  if (!resolvedServiceUrl && !scriptUrl) {
    return [];
  }

  const scriptUrls = [
    ensureAbsoluteUrl(resolvedServiceUrl, 'js/hwpctrlapp/utils/util.js'),
    ensureAbsoluteUrl(resolvedServiceUrl, 'js/hwpctrlapp/hwpCtrlApp.js'),
    scriptUrl || ensureAbsoluteUrl(resolvedServiceUrl, 'js/webhwpctrl.js'),
  ].filter(Boolean);

  return [...new Set(scriptUrls)];
};

export const loadWebHwpRuntime = async (config, { debug = false } = {}) => {
  const scriptUrls = buildWebHwpRuntimeUrls(config);
  if (scriptUrls.length === 0) {
    throw new Error('webhwp_runtime_url_missing');
  }

  for (const url of scriptUrls) {
    if (debug) console.info('[WebHwp] loading script:', url);
    // eslint-disable-next-line no-await-in-loop
    await loadScript(url);
  }

  if (typeof window.BuildWebHwpCtrl !== 'function') {
    throw new Error('build_webhwp_ctrl_missing');
  }

  return window.BuildWebHwpCtrl;
};

export const mountWebHwpControl = async ({
  containerId,
  serviceUrl,
  bootstrapMode = 'server',
  debug = false,
}) => {
  if (typeof window.BuildWebHwpCtrl !== 'function') {
    throw new Error('build_webhwp_ctrl_missing');
  }

  const buildArg = ensureWebHwpBaseUrl(serviceUrl || window.location.href);

  if (debug) {
    console.info('[WebHwp] bootstrapping control', { containerId, buildArg, bootstrapMode });
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      resolve(result || window.HwpCtrl || null);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    try {
      const directResult = window.BuildWebHwpCtrl(
        containerId,
        buildArg,
        () => finalize(window.HwpCtrl || null),
      );
      if (directResult) {
        finalize(directResult);
        return;
      }
      window.setTimeout(() => finalize(window.HwpCtrl || null), 4000);
    } catch (error) {
      try {
        const fallbackResult = window.BuildWebHwpCtrl(
          containerId,
          () => finalize(window.HwpCtrl || null),
        );
        if (fallbackResult) {
          finalize(fallbackResult);
          return;
        }
        window.setTimeout(() => finalize(window.HwpCtrl || null), 4000);
      } catch (fallbackError) {
        fail(fallbackError || error);
      }
    }
  });
};

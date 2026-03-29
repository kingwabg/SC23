import React from 'react';
import { authApi } from '../../../utils/apiClient';
import { getWebHwpClientFlags } from '../config/webhwpConfig';
import { createHtmlDocumentBody } from '../types';
import { createWebHwpBridge, HWPCTRL_EVENT } from '../webhwp/bridge';
import { buildWebHwpRuntimeUrls, loadWebHwpRuntime, mountWebHwpControl } from '../webhwp/loader';

const readinessTone = {
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  disabled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TABLE_ACTION_BUTTONS = [
  { label: '표 삽입', actionId: 'TableCreate' },
  { label: '셀 병합', actionId: 'TableMergeCell' },
  { label: '셀 분할', actionId: 'TableSplitCell' },
  { label: '행 삭제', actionId: 'TableDeleteRow' },
  { label: '열 삭제', actionId: 'TableDeleteColumn' },
  { label: '너비 +', actionId: 'TableResizeCellRight' },
  { label: '너비 -', actionId: 'TableResizeCellLeft' },
  { label: '높이 +', actionId: 'TableResizeCellDown' },
  { label: '높이 -', actionId: 'TableResizeCellUp' },
];

const WEBHWP_RUNTIME_OVERRIDE_KEY = 'webhwpRuntimeOverrides';

const getStoredRuntimeOverrides = () => {
  if (typeof window === 'undefined') {
    return { serviceUrl: '', scriptUrl: '', bootstrapMode: '' };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(WEBHWP_RUNTIME_OVERRIDE_KEY) || '{}');
    return {
      serviceUrl: parsed.serviceUrl || '',
      scriptUrl: parsed.scriptUrl || '',
      bootstrapMode: parsed.bootstrapMode || '',
    };
  } catch {
    return { serviceUrl: '', scriptUrl: '', bootstrapMode: '' };
  }
};

const WebHwpAdapter = ({ value, onChange }) => {
  const [status, setStatus] = React.useState({
    loading: true,
    config: null,
    error: '',
    phase: 'config',
    runtimeReady: false,
    mounted: false,
  });
  const [runtimeOverrides, setRuntimeOverrides] = React.useState(() => getStoredRuntimeOverrides());
  const [mountAttempt, setMountAttempt] = React.useState(0);
  const [extractFormat, setExtractFormat] = React.useState('HWP');
  const [lastExtractSummary, setLastExtractSummary] = React.useState('');
  const [eventLogs, setEventLogs] = React.useState([]);
  const containerId = React.useId().replace(/:/g, '_');
  const mountHostRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const bridgeRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const config = await authApi('/api/webhwp/config');
        if (!cancelled) {
          setStatus((prev) => ({ ...prev, loading: false, config, error: '' }));
        }
      } catch (error) {
        if (!cancelled) {
          setStatus((prev) => ({ ...prev, loading: false, config: null, error: '설정 정보를 불러오지 못했습니다.' }));
        }
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const clientFlags = React.useMemo(() => getWebHwpClientFlags(), []);
  const config = status.config;
  const effectiveHtml = value?.html || '';
  const effectiveConfig = React.useMemo(() => ({
    enabled: Boolean(config?.enabled),
    bootstrapMode: runtimeOverrides.bootstrapMode || config?.bootstrapMode || clientFlags.bootstrapMode,
    scriptUrl: runtimeOverrides.scriptUrl || config?.scriptUrl || '',
    serviceUrl: runtimeOverrides.serviceUrl || config?.serviceUrl || '',
    templates: config?.templates || {},
    readiness: {
      hasClientCredentials: Boolean(config?.readiness?.hasClientCredentials),
      hasScriptUrl: Boolean(runtimeOverrides.scriptUrl || config?.scriptUrl),
      hasServiceUrl: Boolean(runtimeOverrides.serviceUrl || config?.serviceUrl),
    },
  }), [clientFlags.bootstrapMode, config, runtimeOverrides]);
  const isReady = Boolean(
    effectiveConfig.enabled
      && (effectiveConfig.readiness.hasServiceUrl || effectiveConfig.readiness.hasScriptUrl)
      && effectiveConfig.readiness.hasClientCredentials,
  );
  const readinessKey = effectiveConfig.enabled ? (isReady ? 'ready' : 'partial') : 'disabled';
  const runtimeUrls = React.useMemo(() => buildWebHwpRuntimeUrls(effectiveConfig), [effectiveConfig]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WEBHWP_RUNTIME_OVERRIDE_KEY, JSON.stringify(runtimeOverrides));
  }, [runtimeOverrides]);

  React.useEffect(() => {
    let cancelled = false;

    const setupRuntime = async () => {
      if (!effectiveConfig.enabled) return;
      if (!effectiveConfig.scriptUrl && !effectiveConfig.serviceUrl) return;
      if (!mountHostRef.current) return;

      try {
        setStatus((prev) => ({ ...prev, phase: 'runtime', error: '', runtimeReady: false, mounted: false }));
        await loadWebHwpRuntime(effectiveConfig, clientFlags);
        if (cancelled) return;
        setStatus((prev) => ({ ...prev, runtimeReady: true, phase: 'mount' }));
        const control = await mountWebHwpControl({
          containerId,
          serviceUrl: effectiveConfig.serviceUrl,
          bootstrapMode: effectiveConfig.bootstrapMode || clientFlags.bootstrapMode,
          debug: clientFlags.debug,
        });
        if (cancelled) return;
        if (control) {
          const bridge = createWebHwpBridge(control);
          bridgeRef.current = bridge;

          bridge.addEventListener(HWPCTRL_EVENT.ON_MOUSE_LBUTTON_DOWN, (x, y) => {
            setEventLogs((prev) => [
              { id: Date.now() + Math.random(), label: `MouseDown ${x}, ${y}` },
              ...prev,
            ].slice(0, 12));
          });
          bridge.addEventListener(HWPCTRL_EVENT.ON_NOTIFY_MESSAGE, (...args) => {
            setEventLogs((prev) => [
              { id: Date.now() + Math.random(), label: `Notify ${args.map(String).join(' | ')}` },
              ...prev,
            ].slice(0, 12));
          });
        }
        setStatus((prev) => ({ ...prev, mounted: true, phase: 'ready' }));
      } catch (error) {
        if (cancelled) return;
        bridgeRef.current = null;
        setStatus((prev) => ({
          ...prev,
          error: error?.message || 'webhwp_initialize_failed',
          phase: 'error',
          runtimeReady: false,
          mounted: false,
        }));
      }
    };

    setupRuntime();

    return () => {
      cancelled = true;
    };
  }, [
    clientFlags,
    containerId,
    effectiveConfig,
    mountAttempt,
  ]);

  const handleOverrideChange = (field, nextValue) => {
    setRuntimeOverrides((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleRetryMount = () => {
    setMountAttempt((prev) => prev + 1);
  };

  const handleResetOverrides = () => {
    setRuntimeOverrides({ serviceUrl: '', scriptUrl: '', bootstrapMode: '' });
    setMountAttempt((prev) => prev + 1);
  };

  const handleOpenPickedFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !bridgeRef.current) return;

    try {
      await bridgeRef.current.openFile(file, '', '');
      setLastExtractSummary(`열기 성공: ${file.name}`);
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error?.message || 'webhwp_open_failed' }));
    } finally {
      event.target.value = '';
    }
  };

  const handleExtractText = async () => {
    if (!bridgeRef.current) return;

    try {
      const data = await bridgeRef.current.getTextFile(extractFormat, '');
      const normalized = typeof data === 'string' ? data : JSON.stringify(data);
      setLastExtractSummary(`${extractFormat} 추출 완료 (${normalized.length.toLocaleString()} chars)`);
      if (extractFormat === 'HTML') {
        onChange?.(createHtmlDocumentBody(normalized));
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error?.message || 'webhwp_gettextfile_failed' }));
    }
  };

  const handleMoveToDemoField = () => {
    if (!bridgeRef.current) return;
    try {
      bridgeRef.current.moveToField('이름1', true, true, true);
      setLastExtractSummary('MoveToField("이름1") 호출 완료');
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error?.message || 'webhwp_move_to_field_failed' }));
    }
  };

  const handleRunTableAction = (actionId, label) => {
    if (!bridgeRef.current) return;

    try {
      const result = bridgeRef.current.runAction(actionId);
      const isSuccess = typeof result === 'number' ? result > 0 : Boolean(result);
      setLastExtractSummary(`${label} (${actionId}) ${isSuccess ? '호출 완료' : '실행 실패'}`);
    } catch (error) {
      setStatus((prev) => ({ ...prev, error: error?.message || `webhwp_table_action_failed:${actionId}` }));
    }
  };

  if (status.loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm font-bold text-slate-500">
        WebHwp 설정을 확인하는 중입니다...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">WebHwp</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">한컴 웹한글 기안기 어댑터</h3>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-left text-xs font-bold ${readinessTone[readinessKey]}`}>
            상태: {effectiveConfig.enabled ? (isReady ? '연동 준비됨' : '설정 일부 필요') : '비활성화'}
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-4 text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Mount Phase</p>
            <p className="mt-2 text-sm font-black text-slate-900">{status.phase}</p>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              `.../webhwpctrl` base 경로 기준으로 `util.js`, `hwpCtrlApp.js`, `webhwpctrl.js`
              순서로 부팅합니다. 실제 base URL이 설정되면 이 영역에 컨트롤을 마운트합니다.
            </p>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-[12px] text-slate-600">
          <p><span className="font-black text-slate-900">Bootstrap:</span> {effectiveConfig.bootstrapMode}</p>
          <p><span className="font-black text-slate-900">Script URL:</span> {effectiveConfig.scriptUrl || '미설정'}</p>
          <p><span className="font-black text-slate-900">Base URL:</span> {effectiveConfig.serviceUrl || '미설정'}</p>
          <p><span className="font-black text-slate-900">Meeting Template:</span> {effectiveConfig.templates?.meeting || '미설정'}</p>
          <p><span className="font-black text-slate-900">Server Credentials:</span> {effectiveConfig.readiness?.hasClientCredentials ? '준비됨' : '미설정'}</p>
          <p><span className="font-black text-slate-900">Client Debug:</span> {clientFlags.debug ? 'true' : 'false'}</p>
          <p><span className="font-black text-slate-900">Runtime Ready:</span> {status.runtimeReady ? 'true' : 'false'}</p>
          <p><span className="font-black text-slate-900">Mounted:</span> {status.mounted ? 'true' : 'false'}</p>
          </div>
        </div>
        {status.error && (
          <p className="mt-4 text-xs font-bold text-rose-500">{status.error}</p>
        )}
      </div>
      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-h-0 overflow-auto bg-[#d9e0ea] p-6">
          <div className="mx-auto flex min-h-full max-w-[980px] flex-col items-center">
            <div className="mb-4 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs font-bold text-slate-600">
              현재 본문 길이: {effectiveHtml.length.toLocaleString()} chars
            </div>
            <div
              id={containerId}
              ref={mountHostRef}
              className="relative flex min-h-[1122px] w-full max-w-[794px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-[0_15px_40px_rgba(15,23,42,0.12)]"
            >
              {!status.mounted && (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.98))] px-8 text-center">
                  <div className="max-w-md">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Preview Surface</p>
                    <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900">WebHwp 컨트롤 마운트 영역</h4>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                      설정이 준비되면 이 종이 영역에 WebHwp 컨트롤이 직접 렌더링됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-l border-slate-200 bg-slate-50 p-5">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Runtime Setup</p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Base URL</span>
                <input
                  value={runtimeOverrides.serviceUrl}
                  onChange={(e) => handleOverrideChange('serviceUrl', e.target.value)}
                  placeholder="https://webhwp.example.com/webhwpctrl"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Script URL</span>
                <input
                  value={runtimeOverrides.scriptUrl}
                  onChange={(e) => handleOverrideChange('scriptUrl', e.target.value)}
                  placeholder="비워두면 baseUrl 기준 js/webhwpctrl.js 를 사용합니다"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Bootstrap Mode</span>
                <select
                  value={runtimeOverrides.bootstrapMode}
                  onChange={(e) => handleOverrideChange('bootstrapMode', e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">server(default)</option>
                  <option value="server">server</option>
                  <option value="client">client</option>
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleRetryMount}
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-700"
                >
                  다시 시도
                </button>
                <button
                  onClick={handleResetOverrides}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Control Actions</p>
            <div className="mt-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleOpenPickedFile}
                className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600"
              />
              <div className="flex gap-2">
                <select
                  value={extractFormat}
                  onChange={(e) => setExtractFormat(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="HWP">HWP</option>
                  <option value="HTML">HTML</option>
                  <option value="TEXT">TEXT</option>
                </select>
                <button
                  onClick={handleExtractText}
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition-all hover:bg-sky-700"
                >
                  추출
                </button>
              </div>
              <button
                onClick={handleMoveToDemoField}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50"
              >
                MoveToField 테스트
              </button>
              <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600">
                {lastExtractSummary || 'Open / GetTextFile / MoveToField 래퍼가 준비되어 있습니다.'}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Table Tools</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TABLE_ACTION_BUTTONS.map((item) => (
                <button
                  key={item.actionId}
                  onClick={() => handleRunTableAction(item.actionId, item.label)}
                  className="rounded-2xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600">
              한컴 샘플에서 확인한 표 액션 ID를 먼저 노출해뒀습니다. 서버 연결 후 실제 동작을 바로 시험할 수 있습니다.
            </p>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Resolved Scripts</p>
            <div className="mt-4 space-y-2 text-xs font-medium text-slate-600">
              {runtimeUrls.length > 0 ? runtimeUrls.map((url) => (
                <p key={url} className="break-all rounded-xl bg-slate-50 px-3 py-2">{url}</p>
              )) : (
                <p className="rounded-xl bg-slate-50 px-3 py-3">baseUrl 또는 scriptUrl을 입력하면 여기에 실제 로드 대상이 표시됩니다.</p>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Next Wiring</p>
            <div className="mt-4 space-y-3 text-sm font-medium text-slate-600">
              <p>1. `https://서버:포트/webhwpctrl` 형식의 base URL을 위 입력창에 넣고 다시 시도</p>
              <p>2. `BuildWebHwpCtrl("hwpctrl", baseUrl, callback)` 성공 시 Open / GetTextFile / AddEventListener 테스트</p>
              <p>3. 문서 저장을 `GetTextFile` 추출 결과와 `/api/documents` 업로드로 연결</p>
              <p>4. 회의록 필드와 템플릿 치환 로직 연결</p>
            </div>
          </div>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Event Logs</p>
            <div className="mt-4 space-y-2 text-xs font-medium text-slate-600">
              {eventLogs.length > 0 ? eventLogs.map((item) => (
                <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">{item.label}</p>
              )) : (
                <p className="rounded-xl bg-slate-50 px-3 py-3">마우스 클릭이나 알림 이벤트가 잡히면 여기에 표시됩니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebHwpAdapter;

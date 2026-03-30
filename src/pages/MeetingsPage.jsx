import React, { useState, useEffect, useRef, useMemo } from 'react';
import RoosterApp from '../components/RoosterEditor/RoosterApp';
import UploadSidebar from '../components/RoosterEditor/UploadSidebar';
import DataBankSidebar from './meetings/DataBankSidebar';
import { 
  FileText, 
  Search, 
  Plus, 
  Save, 
  Printer, 
  ChevronRight, 
  MessageSquare, 
  Calendar,
  Clock,
  User,
  MoreVertical,
  ArrowRight,
  Database,
  ShieldCheck,
  CheckSquare,
  Trash2
} from 'lucide-react';
import { authApi } from '../utils/apiClient';
import { exportContent } from 'roosterjs-content-model-core';

const RIGHT_SIDEBAR_STORAGE_KEY = 'meetingsRightSidebarWidth';
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 320;
const RIGHT_SIDEBAR_MIN_WIDTH = 280;
const RIGHT_SIDEBAR_MAX_WIDTH = 560;

const clampRightSidebarWidth = (width) => {
  if (typeof window === 'undefined') {
    return Math.min(
      RIGHT_SIDEBAR_MAX_WIDTH,
      Math.max(RIGHT_SIDEBAR_MIN_WIDTH, width || RIGHT_SIDEBAR_DEFAULT_WIDTH),
    );
  }

  const viewportMax = window.innerWidth - 760;
  const maxWidth = Math.min(
    RIGHT_SIDEBAR_MAX_WIDTH,
    Math.max(RIGHT_SIDEBAR_MIN_WIDTH, viewportMax),
  );

  return Math.min(maxWidth, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, width || RIGHT_SIDEBAR_DEFAULT_WIDTH));
};

const hydrateMeetingContentFromDocument = async (meeting, fallbackHtml) => {
  if (!meeting?.documentId) {
    return meeting?.content || fallbackHtml;
  }

  try {
    const response = await authApi(`/api/documents/${meeting.documentId}?includeBody=true`);
    if (response?.body?.kind === 'html') {
      return response.body.html || fallbackHtml;
    }
  } catch (error) {
    console.warn('문서 본문을 불러오지 못해 회의록 캐시 내용을 사용합니다.', error);
  }

  return meeting?.content || fallbackHtml;
};

const persistMeetingDocument = async (meeting, html) => {
  if (meeting?.documentId) {
    const response = await authApi(`/api/documents/${meeting.documentId}/body`, {
      method: 'PUT',
      body: JSON.stringify({
        title: meeting.title || '',
        ownerType: 'meeting',
        ownerId: String(meeting.id),
        engine: 'rooster',
        body: {
          kind: 'html',
          html,
        },
      }),
    });
    return response.document;
  }

  const response = await authApi('/api/documents', {
    method: 'POST',
    body: JSON.stringify({
      document: {
        ownerType: 'meeting',
        ownerId: String(meeting.id),
        title: meeting.title || '',
        engine: 'rooster',
      },
      body: {
        kind: 'html',
        html,
      },
    }),
  });

  return response.document;
};

const resolveCurrentEditorHtml = (editor, fallbackHtml = '') => {
  if (!editor) return fallbackHtml;

  if (typeof editor.getCurrentHtml === 'function') {
    try {
      return editor.getCurrentHtml() || fallbackHtml;
    } catch (error) {
      console.warn('커스텀 에디터 HTML 추출에 실패했습니다.', error);
    }
  }

  try {
    return exportContent(editor) || fallbackHtml;
  } catch (error) {
    console.warn('Rooster 에디터 HTML 추출에 실패했습니다.', error);
  }

  try {
    const body = editor.getDocument?.().body;
    const root = body?.querySelector?.('.sc-editor-root');
    if (root?.innerHTML) {
      return root.innerHTML;
    }
  } catch (error) {
    console.warn('에디터 DOM HTML 추출에 실패했습니다.', error);
  }

  return fallbackHtml;
};

const escapeInlineHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const getEditorSelectionContext = (editor) => {
  if (!editor) return null;

  const doc = editor.getDocument?.();
  if (!doc) return null;

  const root = doc.querySelector?.('.sc-editor-root') || doc.body;
  if (!root) return null;

  const selection = doc.getSelection?.() ?? window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { doc, root, selection: null, range: null, cell: null };
  }

  const range = selection.getRangeAt(0);
  const hasEditorSelection = root.contains(range.commonAncestorContainer);
  if (!hasEditorSelection) {
    return { doc, root, selection, range: null, cell: null };
  }

  const anchorNode = range.startContainer?.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer?.parentElement;
  const cell = anchorNode?.closest?.('td, th') || null;

  return {
    doc,
    root,
    selection,
    range,
    cell: cell && root.contains(cell) ? cell : null,
  };
};

const moveCaretToEndOfElement = (doc, selection, element) => {
  if (!doc || !selection || !element) return;

  const range = doc.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const replaceSelectedTableCellHtml = (editor, html) => {
  const context = getEditorSelectionContext(editor);
  if (!context?.cell) return false;

  context.cell.innerHTML = html;
  moveCaretToEndOfElement(context.doc, context.selection, context.cell);
  return true;
};

const fillTableCellsFromSelection = (editor, values) => {
  const context = getEditorSelectionContext(editor);
  if (!context?.cell || !Array.isArray(values) || values.length === 0) return false;

  const table = context.cell.closest('table');
  if (!table) return false;

  const cells = Array.from(table.rows).flatMap((row) => Array.from(row.cells));
  const startIndex = cells.indexOf(context.cell);
  if (startIndex === -1) return false;

  let lastCell = context.cell;
  values.forEach((value, index) => {
    const cell = cells[startIndex + index];
    if (!cell) return;
    cell.innerHTML = escapeInlineHtml(value);
    lastCell = cell;
  });

  moveCaretToEndOfElement(context.doc, context.selection, lastCell);
  return true;
};

const insertHtmlIntoEditorSelection = (editor, html) => {
  if (!editor || !html) return false;

  const doc = editor.getDocument?.();
  if (!doc) return false;

  const root = doc.querySelector?.('.sc-editor-root') || doc.body;
  if (!root) return false;

  if (typeof editor.focus === 'function') {
    editor.focus();
  }

  const container = doc.createElement('div');
  container.innerHTML = html;

  const fragment = doc.createDocumentFragment();
  let lastNode = null;

  while (container.firstChild) {
    lastNode = fragment.appendChild(container.firstChild);
  }

  const selection = doc.getSelection?.() ?? window.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const hasEditorSelection = Boolean(range && root.contains(range.commonAncestorContainer));

  if (hasEditorSelection) {
    range.deleteContents();
    range.insertNode(fragment);
  } else {
    root.appendChild(fragment);
  }

  if (selection && lastNode) {
    const nextRange = doc.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  return true;
};

const loadChildrenDataFallback = async () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('forestChildrenList');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore malformed local fallback and continue to bundled seed data.
    }
  }

  try {
    const module = await import('../imported_children.js');
    if (Array.isArray(module.IMPORTED_CHILDREN)) {
      return module.IMPORTED_CHILDREN;
    }
  } catch {
    // Ignore optional bundled fallback load failures.
  }

  return [];
};

const MeetingsPage = () => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [rightTab, setRightTab] = useState('info'); // info | uploads | data
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [childrenData, setChildrenData] = useState([]);
  const [isDataBankLoading, setIsDataBankLoading] = useState(false);
  const [dataBankError, setDataBankError] = useState('');
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return RIGHT_SIDEBAR_DEFAULT_WIDTH;
    }

    const savedWidth = Number(window.localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY));
    return clampRightSidebarWidth(Number.isFinite(savedWidth) ? savedWidth : RIGHT_SIDEBAR_DEFAULT_WIDTH);
  });
  const [isRightSidebarResizing, setIsRightSidebarResizing] = useState(false);
  const editorRef = useRef(null);
  const loadedDocumentIdsRef = useRef(new Set());
  const rightSidebarResizeRef = useRef({ startX: 0, startWidth: RIGHT_SIDEBAR_DEFAULT_WIDTH });

  useEffect(() => {
    const fetchMeetings = async () => {
      const loadFallback = (attemptSync) => {
        const saved = localStorage.getItem('forestMeetings');
        if (saved && saved !== '[]') {
          const parsed = JSON.parse(saved);
          const migrated = parsed.map(m => ({ ...m, type: 'STAFF_MEETING' }));
          setMeetings(migrated);
          if (attemptSync) {
            for (const m of migrated) {
              authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: m }) }).catch(() => null);
            }
          }
        } else {
          const defaultMeeting = { id: Date.now(), title: '3월 16일 월요일 기안', type: 'STAFF_MEETING', date: '2026.03.16', author: '홍길동', dept: '운영팀', status: '작성 중', content: '' };
          setMeetings([defaultMeeting]);
          if (attemptSync) {
            authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: defaultMeeting }) }).catch(() => null);
          }
        }
      };

      try {
        const data = await authApi('/api/meetings');
        const dbMeetings = Array.isArray(data.meetings) ? data.meetings : [];
        const staffMeetings = dbMeetings.filter(m => m.type === 'STAFF_MEETING');
        
        if (staffMeetings.length > 0) {
          setMeetings(staffMeetings);
        } else {
          loadFallback(true);
        }
      } catch (err) {
        if (err.message === 'unauthenticated') {
           console.info('ℹ️ [오프라인 모드] 로그인이 되어있지 않아 로컬 저장소 모드로 전환되었습니다.');
        } else {
           console.warn('⚠️ DB 통신 실패 - 로컬 데이터로 대체합니다.', err);
        }
        loadFallback(false);
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (meetings.length === 0) return;
    let currentMeetings = [...meetings];
    let savedSync = false;
    let attempts = 0;

    while (!savedSync && currentMeetings.length > 0 && attempts < 50) {
      try {
        localStorage.setItem('forestMeetings', JSON.stringify(currentMeetings));
        savedSync = true;
      } catch {
        currentMeetings.pop();
        attempts++;
      }
    }

    if (savedSync && currentMeetings.length < meetings.length) {
      alert(`⚠️ 용량 부족: 브라우저 저장 공간 확보를 위해 가장 오래된 임시 기록 ${meetings.length - currentMeetings.length}개가 지워졌습니다.`);
      setMeetings(currentMeetings);
    }
  }, [meetings]);

  useEffect(() => {
    if (meetings.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  const [checkedMeetings, setCheckedMeetings] = useState([]);
  const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedMeetingId), [meetings, selectedMeetingId]);

  useEffect(() => {
    if (rightTab !== 'data') return;

    let cancelled = false;

    const loadChildrenData = async () => {
      setIsDataBankLoading(true);
      setDataBankError('');

      try {
        const response = await authApi('/api/children');
        const serverChildren = Array.isArray(response?.children) ? response.children : [];
        if (cancelled) return;

        if (serverChildren.length > 0) {
          setChildrenData(serverChildren);
          return;
        }

        const fallbackChildren = await loadChildrenDataFallback();
        if (cancelled) return;
        setChildrenData(fallbackChildren);
        setDataBankError(
          fallbackChildren.length > 0
            ? '서버 출결 데이터가 비어 있어 로컬 저장 데이터를 표시합니다.'
            : '등록된 아동 출결 데이터가 없습니다.',
        );
      } catch (error) {
        const fallbackChildren = await loadChildrenDataFallback();
        if (cancelled) return;

        setChildrenData(fallbackChildren);
        if (fallbackChildren.length > 0) {
          setDataBankError(
            error.message === 'unauthenticated' || error.message === 'session_expired'
              ? '로그인 정보가 없어 로컬 저장 데이터를 표시합니다.'
              : '서버 연결이 불안정해 로컬 저장 데이터를 표시합니다.',
          );
        } else {
          setDataBankError(
            error.message === 'unauthenticated' || error.message === 'session_expired'
              ? '로그인이 필요합니다. 아동관리에서 저장한 로컬 데이터가 없으면 출결 조각을 만들 수 없습니다.'
              : '출결 데이터를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsDataBankLoading(false);
        }
      }
    };

    loadChildrenData().catch(() => {
      if (!cancelled) {
        setIsDataBankLoading(false);
        setDataBankError('출결 데이터를 불러오지 못했습니다.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rightTab]);

  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setCheckedMeetings(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (checkedMeetings.length === meetings.length) {
      setCheckedMeetings([]);
    } else {
      setCheckedMeetings(meetings.map(m => m.id));
    }
  };

  const requestDelete = (e, id) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await authApi(`/api/meetings/${deleteTargetId}`, { method: 'DELETE' });
    } catch (_) {
      // Local state cleanup should still proceed when remote deletion fails.
    }
    const newM = meetings.filter(m => m.id !== deleteTargetId);
    setMeetings(newM);
    if (selectedMeetingId === deleteTargetId) setSelectedMeetingId(newM[0]?.id || null);
    setCheckedMeetings(prev => prev.filter(mid => mid !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const executeBatchDelete = async () => {
    if (checkedMeetings.length === 0) return;
    for (const id of checkedMeetings) {
      try {
        await authApi(`/api/meetings/${id}`, { method: 'DELETE' });
      } catch (_) {
        // Batch deletion is best-effort; keep removing local rows.
      }
    }
    const newM = meetings.filter(m => !checkedMeetings.includes(m.id));
    setMeetings(newM);
    if (checkedMeetings.includes(selectedMeetingId)) setSelectedMeetingId(newM[0]?.id || null);
    setCheckedMeetings([]);
    setShowBatchDeleteModal(false);
  };


  // Initial Content Template (HWP Style)
  const initialTemplate = `
    <div style="text-align: center; margin-bottom: 30px; padding: 20px;">
        <h2 style="font-size: 26px; font-weight: 800; border-bottom: 2px solid #333; display: inline-block; padding-bottom: 8px; margin-bottom: 5px;">OO부 운영 회의록</h2>
        <p style="font-size: 11px; color: #888; letter-spacing: 2px;">OFFICIAL RECORD</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tbody>
            <tr>
                <td style="border: 1px solid #111; background-color: #f8f9fa; width: 15%; padding: 12px; font-weight: bold; text-align: center;">회의명</td>
                <td style="border: 1px solid #111; width: 35%; padding: 12px;">정기 주간 회의</td>
                <td style="border: 1px solid #111; background-color: #f8f9fa; width: 15%; padding: 12px; font-weight: bold; text-align: center;">일시</td>
                <td style="border: 1px solid #111; width: 35%; padding: 12px;">2026. 03. 16. 14:00</td>
            </tr>
            <tr>
                <td style="border: 1px solid #111; background-color: #f8f9fa; padding: 12px; font-weight: bold; text-align: center;">장소</td>
                <td style="border: 1px solid #111; padding: 12px;">대회의실</td>
                <td style="border: 1px solid #111; background-color: #f8f9fa; padding: 12px; font-weight: bold; text-align: center;">기록자</td>
                <td style="border: 1px solid #111; padding: 12px;">홍길동 (주임)</td>
            </tr>
        </tbody>
    </table>

    <div style="margin-bottom: 40px;">
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">1. 회의 안건</p>
        <p>&nbsp;&nbsp;가. 아동 시설 안전 점검 결과 보고 및 보수 계획</p>
        <p>&nbsp;&nbsp;나. 신규 입소 아동 적응 지원 프로세서 고도화</p>
        <p>&nbsp;</p>
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">2. 회의 내용</p>
        <p>&nbsp;&nbsp;- 세부 논의 사항 기술...</p>
        <p>&nbsp;</p>
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">3. 결정 사항 및 향후 조치</p>
        <p>&nbsp;&nbsp;- 조치 내용 기술...</p>
        <p>&nbsp;</p>
        <p style="text-align: right; margin-top: 100px; font-weight: 700;">이상 끝.</p>
    </div>
  `;

  const contentRef = useRef('');
  useEffect(() => {
    contentRef.current = selectedMeeting?.content || initialTemplate;
  }, [selectedMeetingId, selectedMeeting, initialTemplate]);

  useEffect(() => {
    let cancelled = false;

    const syncSelectedMeetingDocument = async () => {
      if (!selectedMeeting?.documentId) return;
      if (loadedDocumentIdsRef.current.has(selectedMeeting.documentId)) return;

      setIsDocumentLoading(true);
      const html = await hydrateMeetingContentFromDocument(selectedMeeting, initialTemplate);
      if (cancelled) return;

      loadedDocumentIdsRef.current.add(selectedMeeting.documentId);
      contentRef.current = html;
      setMeetings((prev) => prev.map((meeting) => (
        meeting.id === selectedMeeting.id
          ? { ...meeting, content: html }
          : meeting
      )));
      setIsDocumentLoading(false);
    };

    syncSelectedMeetingDocument().catch(() => {
      if (!cancelled) setIsDocumentLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedMeeting, initialTemplate]);

  const handleSave = () => {
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    const targetMeeting = meetings.find(m => m.id === selectedMeetingId);
    if (!targetMeeting) return;
    const content = resolveCurrentEditorHtml(editorRef.current, contentRef.current || targetMeeting.content || initialTemplate);
    contentRef.current = content;

    const updatedMeeting = { ...targetMeeting, content };
    setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? updatedMeeting : m));
    setShowConfirmModal(false);

    try {
      const document = await persistMeetingDocument(updatedMeeting, content);
      const meetingUpdates = {
        ...updatedMeeting,
        documentId: document.id,
        document,
      };

      await authApi(`/api/meetings/${selectedMeetingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ updates: meetingUpdates })
      });
      loadedDocumentIdsRef.current.add(document.id);
      setMeetings(prev => prev.map(m => (
        m.id === selectedMeetingId
          ? { ...meetingUpdates }
          : m
      )));
    } catch (e) {
      await authApi('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ meeting: updatedMeeting })
      }).catch(() => null);
    }

    setShowSaveModal(true);
    setTimeout(() => setShowSaveModal(false), 800);
  };

  const handleNewMeeting = async () => {
    const id = Date.now();
    const newDoc = {
      id,
      title: `${new Date().toLocaleDateString()} 신규 회의록`,
      date: new Date().toISOString().split('T')[0],
      author: '시스템 관리자',
      dept: '운영팀',
      status: '작성 중',
      type: 'STAFF_MEETING',
      content: initialTemplate
    };
    try {
      const created = await authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: newDoc }) });
      const createdMeeting = created?.meeting || newDoc;
      setMeetings([createdMeeting, ...meetings]);
      if (createdMeeting.documentId) {
        loadedDocumentIdsRef.current.add(createdMeeting.documentId);
      }
      setSelectedMeetingId(createdMeeting.id);
      return;
    } catch(err) {}
    
    setMeetings([newDoc, ...meetings]);
    setSelectedMeetingId(id);
  };

  const handleUpdateField = (field, value) => {
    setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, [field]: value } : m));
  };

  const syncSelectedMeetingContent = () => {
    if (!selectedMeetingId) return;
    const nextHtml = resolveCurrentEditorHtml(
      editorRef.current,
      contentRef.current || selectedMeeting?.content || initialTemplate,
    );
    contentRef.current = nextHtml;
    setMeetings((prev) => prev.map((meeting) => (
      meeting.id === selectedMeetingId
        ? { ...meeting, content: nextHtml }
        : meeting
    )));
  };

  const handleInsertDataHtml = (html) => {
    const editor = editorRef.current;
    if (!editor || !selectedMeetingId) return;

    const inserted = insertHtmlIntoEditorSelection(editor, html);
    if (!inserted) return;

    syncSelectedMeetingContent();
  };

  const handleInsertDataText = (text) => {
    const editor = editorRef.current;
    if (!editor || !selectedMeetingId) return;

    const sanitizedText = escapeInlineHtml(text);
    const replaced = replaceSelectedTableCellHtml(editor, sanitizedText);
    if (!replaced) {
      const inserted = insertHtmlIntoEditorSelection(editor, sanitizedText);
      if (!inserted) return;
    }

    syncSelectedMeetingContent();
  };

  const handleInsertDailyPresentValue = (summary) => {
    if (!summary) return;
    handleInsertDataText(String(summary.presentCount));
  };

  const handleFillMonthlyPresentValues = (summaries) => {
    const editor = editorRef.current;
    if (!editor || !selectedMeetingId) return;

    const presentCounts = (Array.isArray(summaries) ? summaries : []).map((summary) => String(summary.presentCount ?? ''));
    if (presentCounts.length === 0) return;

    const filled = fillTableCellsFromSelection(editor, presentCounts);
    if (!filled) {
      window.alert('표 안의 시작 셀을 먼저 클릭한 뒤 다시 시도해 주세요.');
      return;
    }

    syncSelectedMeetingContent();
  };

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '0';
      main.style.overflow = 'hidden';
    }
    return () => {
      if (main) {
        main.style.padding = '';
        main.style.overflow = '';
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, String(rightSidebarWidth));
  }, [rightSidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleWindowResize = () => {
      setRightSidebarWidth((currentWidth) => clampRightSidebarWidth(currentWidth));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  useEffect(() => {
    if (!isRightSidebarResizing) return undefined;

    const handlePointerMove = (event) => {
      const { startX, startWidth } = rightSidebarResizeRef.current;
      const nextWidth = clampRightSidebarWidth(startWidth + (startX - event.clientX));
      setRightSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsRightSidebarResizing(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isRightSidebarResizing]);

  const handleRightSidebarResizeStart = (event) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;

    event.preventDefault();
    rightSidebarResizeRef.current = {
      startX: event.clientX,
      startWidth: rightSidebarWidth,
    };
    setIsRightSidebarResizing(true);
  };

  return (
    <div className="flex h-[100vh] bg-slate-50 overflow-hidden font-['Outfit']">
      <div className="w-[340px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
           <div className="flex flex-col">
              <h2 className="text-[16px] font-black text-slate-900 tracking-tight">운영 회의록</h2>
              <span className="text-[11px] font-bold text-slate-400">Total {meetings.length} Documents</span>
           </div>
           <button onClick={handleNewMeeting} className="w-8 h-8 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center">
              <Plus className="w-4 h-4" />
           </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="회의명, 주체 검색..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:font-medium" />
          </div>
          <div className="flex justify-between items-center px-1">
             <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" checked={checkedMeetings.length > 0 && checkedMeetings.length === meetings.length} onChange={toggleAll} />
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors">전체선택</span>
             </label>
             {checkedMeetings.length > 0 && (
               <button onClick={() => setShowBatchDeleteModal(true)} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                 <Trash2 className="w-3 h-3" /> 일괄삭제
               </button>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {meetings.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`group flex items-start gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all ${selectedMeetingId === m.id ? 'bg-indigo-50/50 relative' : 'hover:bg-slate-50'}`}
            >
              {selectedMeetingId === m.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
              
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                 <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" checked={checkedMeetings.includes(m.id)} onChange={(e) => toggleCheck(e, m.id)} />
              </div>
              
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex justify-between items-start gap-2">
                   <h4 className={`text-[13px] font-black truncate leading-tight ${selectedMeetingId === m.id ? 'text-indigo-900' : 'text-slate-800'}`}>{m.title}</h4>
                   <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${m.status === '완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.status}
                   </span>
                </div>
                
                <div className="flex justify-between items-end mt-1">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wide">{m.date}</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                         <span className={selectedMeetingId === m.id ? 'text-indigo-600 font-bold' : ''}>{m.author}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                         <span>{m.termType || '학기중'}</span>
                      </div>
                   </div>
                   <button onClick={(e) => requestDelete(e, m.id)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${selectedMeetingId === m.id ? 'text-indigo-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Column: Editor */}
      <div className="flex-1 flex flex-col bg-slate-100/50 relative overflow-hidden">
        <div className="h-16 bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0 z-10 shadow-sm">
           <div className="flex items-center gap-4 flex-1 mr-4">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black"><FileText className="w-4 h-4" /></div>
              <input 
                type="text" 
                value={selectedMeeting?.title || ''} 
                onChange={(e) => handleUpdateField('title', e.target.value)}
                className="flex-1 text-[15px] font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="문서 제목을 입력하세요"
              />
           </div>
           <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"><Printer className="w-4 h-4" /> 인쇄</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Save className="w-4 h-4" /> 기록 저장</button>
           </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{scrollbarGutter: 'stable'}}>
              {isDocumentLoading && (
                <div className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700">
                  문서 본문을 불러오는 중입니다...
                </div>
              )}
              <RoosterApp
                key={selectedMeetingId}
                initialHtml={selectedMeeting?.content || initialTemplate}
                editorInstanceRef={editorRef}
                onChangeHtml={(html) => {
                  contentRef.current = html;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Metadata & Uploads */}
      <div
        className="relative flex shrink-0 flex-col border-l border-slate-200 bg-white"
        style={{ width: `${rightSidebarWidth}px` }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="오른쪽 사이드바 너비 조절"
          onPointerDown={handleRightSidebarResizeStart}
          className="absolute inset-y-0 -left-2 z-30 hidden w-4 cursor-col-resize items-center justify-center md:flex"
        >
          <div
            className={`flex h-24 w-2 items-center justify-center rounded-full border transition-all ${
              isRightSidebarResizing
                ? 'border-indigo-300 bg-indigo-100 shadow-[0_0_0_6px_rgba(99,102,241,0.12)]'
                : 'border-slate-200 bg-white/90 hover:border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <div className="h-12 w-[3px] rounded-full bg-slate-300" />
          </div>
        </div>

        {/* 사이드바 탭 헤더 */}
        <div className="grid grid-cols-3 border-b border-slate-100">
          <button 
            onClick={() => setRightTab('info')}
            className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all ${rightTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
          >
            기안 정보
          </button>
          <button 
            onClick={() => setRightTab('uploads')}
            className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all ${rightTab === 'uploads' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
          >
            이미지 뱅크
          </button>
          <button 
            onClick={() => setRightTab('data')}
            className={`py-4 text-[11px] font-black uppercase tracking-widest transition-all ${rightTab === 'data' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
          >
            데이터 뱅크
          </button>
        </div>

        {rightTab === 'info' ? (
          <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1">
             <section className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <Database className="w-4 h-4 text-slate-400" />
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Document Meta</h5>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
                    <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">기안 연월일</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                      <input 
                        type="date" 
                        value={selectedMeeting?.date ? selectedMeeting.date.replace(/\./g, '-') : ''} 
                        onChange={(e) => handleUpdateField('date', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
                    <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">운영 상태 및 시간</label>
                    <div className="flex gap-2">
                       <select 
                         value={selectedMeeting?.termType || '학기중'} 
                         onChange={(e) => handleUpdateField('termType', e.target.value)}
                         className="w-24 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer appearance-none text-center"
                       >
                          <option value="학기중">학기중</option>
                          <option value="방학중">방학중</option>
                          <option value="기타">기타</option>
                       </select>
                       <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-xl px-3 py-2.5 flex items-center gap-1 transition-all">
                          <input 
                            type="text" 
                            value={selectedMeeting?.startTime || '09:00'} 
                            onChange={(e) => handleUpdateField('startTime', e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none text-center"
                            placeholder="시작"
                          />
                          <span className="text-slate-400 font-black text-xs">~</span>
                          <input 
                            type="text" 
                            value={selectedMeeting?.endTime || '18:00'} 
                            onChange={(e) => handleUpdateField('endTime', e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none text-center"
                            placeholder="종료"
                          />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 focus-within:text-emerald-600 transition-colors">
                    <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">기안자</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                      <input 
                        type="text" 
                        value={selectedMeeting?.author || ''} 
                        onChange={(e) => handleUpdateField('author', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all"
                        placeholder="기안자 이름"
                      />
                    </div>
                  </div>
                </div>
             </section>

             <section className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Approval Matrix</h5>
                </div>
                <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                   <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">장</div>
                      <div>
                         <p className="text-[11px] font-bold">시설장 검토 대기</p>
                         <p className="text-[9px] text-slate-500 uppercase tracking-widest">Pending Boss</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-white/10">
                      <button className="w-full py-2 bg-white/10 hover:bg-white/20 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">결재 요청하기</button>
                   </div>
                </div>
             </section>

             <div className="p-8 bg-indigo-50 rounded-3xl space-y-3 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-100 rounded-full blur-2xl group-hover:scale-150 transition-all" />
                <h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest relative z-10">Smart AI Assistant</h6>
                <p className="text-[11px] font-bold text-slate-400 leading-relaxed relative z-10">회의록 내용을 기반으로 아동별 관찰일지를 자동 생성할 수 있습니다.</p>
                <button className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-2 relative z-10">일지 생성 실행 <ArrowRight className="w-3 h-3" /></button>
             </div>
          </div>
        ) : rightTab === 'uploads' ? (
          <UploadSidebar onInsertImage={(url) => {
             const editor = editorRef.current;
             if (!editor) return;

             if (typeof editor.insertImage === 'function') {
                editor.insertImage({ src: url, altText: 'uploaded image' });
                return;
             }

             try {
                if (typeof editor.focus === 'function') {
                  editor.focus();
                }
                const img = `<img src="${url}" style="max-width: 100%; border: none; outline: none; margin: 10px 0;" />`;
                document.execCommand('insertHTML', false, img);
             } catch (err) {
                 console.error('이미지 삽입 실패:', err);
              }
           }} />
        ) : (
          <DataBankSidebar
            childrenData={childrenData}
            isLoading={isDataBankLoading}
            loadError={dataBankError}
            onInsertText={handleInsertDataText}
            onInsertHtml={handleInsertDataHtml}
            onInsertDailyPresentValue={handleInsertDailyPresentValue}
            onFillMonthlyPresentValues={handleFillMonthlyPresentValues}
          />
        )}
      </div>

      {/* Delete Single Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center shadow-inner">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">문서 삭제</h3>
              <p className="text-sm font-bold text-slate-500">정말로 이 문서를 삭제하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeDelete} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center shadow-inner">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">일괄 삭제 확인</h3>
              <p className="text-sm font-bold text-slate-500">선택한 {checkedMeetings.length}개의 문서를 모두 삭제하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setShowBatchDeleteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeBatchDelete} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">일괄 삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">수정 확인</h3>
              <p className="text-sm font-bold text-slate-500">기록을 수정하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeSave} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-indigo-600/20">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-5 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-[6px] border-emerald-100 flex items-center justify-center shadow-inner">
              <CheckSquare className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">저장 완료</h3>
              <p className="text-sm font-bold text-slate-400">기록이 안전하게 저장되었습니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;

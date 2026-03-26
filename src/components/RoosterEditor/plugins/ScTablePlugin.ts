import { EditorPlugin, IEditor, PluginEvent } from 'roosterjs-content-model-types';
import { exportContent } from 'roosterjs-content-model-core';
import { ScTableEngine } from './ScTableEngine';

/**
 * 🔗 ScTablePlugin (Bridge)
 * RoosterJS와 독립형 ScTableEngine 사이를 연결하는 브리지 플러그인입니다.
 */
export class ScTablePlugin implements EditorPlugin {
  private editor: IEditor | null = null;
  private engine: ScTableEngine;
  private onHtmlChange: (html: string) => void;

  constructor(onHtmlChange: (html: string) => void) {
    this.onHtmlChange = onHtmlChange;
    // 엔진 인스턴스 초기화 (모델 데이터 기반 알림 콜백 주입)
    this.engine = new ScTableEngine((html) => {
      // 에디터 변경 알림 (상위 React 컴포넌트로 전달)
      if (this.editor) this.onHtmlChange(exportContent(this.editor));
    });
  }

  getName() { return 'ScTablePlugin'; }

  initialize(editor: IEditor) {
    this.editor = editor;
    (editor as any).scTableEngine = this.engine; // 외부 컴포넌트 접근용 익스포트
    const body = editor.getDocument().body;
    
    // 🖱️ 모든 포인터 이벤트를 독립 엔진으로 위임
    body.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('mousedown', this.onClickOutside);
  }

  dispose() {
    if (!this.editor) return;
    const body = this.editor.getDocument().body;
    body.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('mousedown', this.onClickOutside);
    this.editor = null;
  }

  onPluginEvent(event: PluginEvent) {
    // 0: BeforePaste, 6: ContentChanged, 10: Edit
    const type = event.eventType as unknown as number;
    if ([0, 6, 10].includes(type)) {
       this.normalizeAllTables();
    }
  }

  private normalizeAllTables() {
    if (!this.editor) return;
    const tables = this.editor.getDocument().querySelectorAll('table');
    tables.forEach(table => {
      // 🏗️ 엔진을 통한 자동 구조화 (colgroup, table-layout 등)
      this.engine.buildModel(table as HTMLTableElement);
      this.engine.syncToDOM();
    });
  }

  // ── [Event Relay] 엔진으로 이벤트 전달 ──
  private onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement;
    if (!cell) return;

    // 엔진 시작
    this.engine.handleDown(e, target);
    
    // 후속 이벤트 리스너 (엔진이 포인터를 캡처하므로 window에서 추적)
    const onMove = (moveEvt: PointerEvent) => this.engine.handleMove(moveEvt, target);
    const onUp = (upEvt: PointerEvent) => {
      this.engine.handleUp(upEvt);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // 스냅샷 촬영 연동
      this.editor?.takeSnapshot();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // 표 선택 UI 갱신 (전역 클래스)
    this.engine.deselectAllTables();
    const table = cell.closest('table');
    if (table) table.classList.add('sc-selected-table');
  };

  private onClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('table') && !target.closest('.rooster-toolbar')) {
      this.engine.deselectAllTables();
      this.engine.deselectAllCells();
    }
  };
}

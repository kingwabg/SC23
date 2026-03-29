import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './TableCreateModal.css';

export interface TableCreateConfig {
  rows: number;
  cols: number;
  widthMode: 'fit' | 'fixed';
  widthMm: number;
  rowHeightMm: number;
  hasHeaderRow: boolean;
  hasFirstColumn: boolean;
  preset: 'plain' | 'meeting';
  density: 'compact' | 'comfortable' | 'spacious';
  inline: boolean;
}

interface Props {
  initialRows?: number;
  initialCols?: number;
  onClose: () => void;
  onApply: (config: TableCreateConfig) => void;
}

const PRESETS: Array<{ label: string; value: TableCreateConfig['preset']; description: string }> = [
  { label: '일반 표', value: 'plain', description: '자유롭게 편집할 기본 표' },
  { label: '회의록형', value: 'meeting', description: '레이블 열과 머리행이 있는 회의록 스타일' },
];

export default function TableCreateModal({
  initialRows = 3,
  initialCols = 3,
  onClose,
  onApply,
}: Props) {
  const [config, setConfig] = useState<TableCreateConfig>({
    rows: initialRows,
    cols: initialCols,
    widthMode: 'fit',
    widthMm: 160,
    rowHeightMm: 10,
    hasHeaderRow: false,
    hasFirstColumn: false,
    preset: 'plain',
    density: 'comfortable',
    inline: false,
  });

  const previewGrid = useMemo(
    () =>
      Array.from({ length: config.rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="create-table-preview-row"
          style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}
        >
          {Array.from({ length: config.cols }).map((__, colIndex) => (
            <span
              key={`cell-${rowIndex}-${colIndex}`}
              className={[
                config.hasHeaderRow && rowIndex === 0 ? 'header' : '',
                config.hasFirstColumn && colIndex === 0 ? 'first' : '',
                config.preset === 'meeting' && colIndex % 2 === 0 ? 'meeting' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
      )),
    [config]
  );

  const updateConfig = <K extends keyof TableCreateConfig>(key: K, value: TableCreateConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return createPortal(
    <div className="create-table-overlay" onClick={onClose}>
      <div className="create-table-card" onClick={(e) => e.stopPropagation()}>
        <div className="create-table-header">
          <div>
            <h3>표 만들기</h3>
            <p>행/열 수와 폭, 밀도, 회의록 스타일을 한 번에 설정합니다.</p>
          </div>
          <button type="button" className="create-table-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="create-table-body">
          <section className="create-table-section">
            <div className="create-table-section-title">기본 구조</div>
            <div className="create-table-grid two">
              <label>
                행
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={config.rows}
                  onChange={(e) => updateConfig('rows', Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                />
              </label>
              <label>
                열
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={config.cols}
                  onChange={(e) => updateConfig('cols', Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                />
              </label>
            </div>

            <div className="create-table-preset-list">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={config.preset === preset.value ? 'active' : ''}
                  onClick={() => {
                    updateConfig('preset', preset.value);
                    if (preset.value === 'meeting') {
                      updateConfig('hasHeaderRow', true);
                      updateConfig('hasFirstColumn', true);
                      updateConfig('widthMode', 'fit');
                      updateConfig('density', 'comfortable');
                    }
                  }}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="create-table-section">
            <div className="create-table-section-title">폭과 높이</div>
            <div className="create-table-radio-row">
              <button
                type="button"
                className={config.widthMode === 'fit' ? 'active' : ''}
                onClick={() => updateConfig('widthMode', 'fit')}
              >
                문단 폭 맞춤
              </button>
              <button
                type="button"
                className={config.widthMode === 'fixed' ? 'active' : ''}
                onClick={() => updateConfig('widthMode', 'fixed')}
              >
                고정 폭
              </button>
            </div>
            <div className="create-table-grid two">
              <label>
                표 너비 (mm)
                <input
                  type="number"
                  min={60}
                  max={260}
                  disabled={config.widthMode !== 'fixed'}
                  value={config.widthMm}
                  onChange={(e) => updateConfig('widthMm', Math.max(60, Math.min(260, Number(e.target.value) || 60)))}
                />
              </label>
              <label>
                행 높이 (mm)
                <input
                  type="number"
                  min={6}
                  max={40}
                  value={config.rowHeightMm}
                  onChange={(e) => updateConfig('rowHeightMm', Math.max(6, Math.min(40, Number(e.target.value) || 6)))}
                />
              </label>
            </div>
          </section>

          <section className="create-table-section">
            <div className="create-table-section-title">스타일</div>
            <div className="create-table-choice-group">
              <div className="create-table-choice-label">밀도</div>
              <div className="create-table-radio-row">
                {(['compact', 'comfortable', 'spacious'] as const).map((density) => (
                  <button
                    key={density}
                    type="button"
                    className={config.density === density ? 'active' : ''}
                    onClick={() => updateConfig('density', density)}
                  >
                    {density === 'compact' ? '촘촘' : density === 'comfortable' ? '보통' : '넉넉'}
                  </button>
                ))}
              </div>
            </div>

            <div className="create-table-checks">
              <label>
                <input
                  type="checkbox"
                  checked={config.hasHeaderRow}
                  onChange={(e) => updateConfig('hasHeaderRow', e.target.checked)}
                />
                머리행 만들기
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={config.hasFirstColumn}
                  onChange={(e) => updateConfig('hasFirstColumn', e.target.checked)}
                />
                첫 열 강조
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={config.inline}
                  onChange={(e) => updateConfig('inline', e.target.checked)}
                />
                글자처럼 취급
              </label>
            </div>
          </section>

          <aside className="create-table-preview">
            <div className="create-table-preview-title">미리보기</div>
            <div className={`create-table-preview-paper ${config.widthMode === 'fit' ? 'fit' : 'fixed'}`}>
              {previewGrid}
            </div>
          </aside>
        </div>

        <div className="create-table-footer">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" onClick={() => onApply(config)}>
            표 만들기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

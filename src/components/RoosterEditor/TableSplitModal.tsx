import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './TableSplitModal.css';

interface Props {
  onClose: () => void;
  onApply: (rows: number, cols: number) => void;
}

const PRESETS = [
  { label: '2 x 1', rows: 2, cols: 1 },
  { label: '1 x 2', rows: 1, cols: 2 },
  { label: '2 x 2', rows: 2, cols: 2 },
  { label: '3 x 2', rows: 3, cols: 2 },
];

export default function TableSplitModal({ onClose, onApply }: Props) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  return createPortal(
    <div className="split-modal-overlay" onClick={onClose}>
      <div className="split-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="split-modal-header">
          <div>
            <h3>셀 나누기</h3>
            <p>한글처럼 현재 셀을 원하는 행/열 수만큼 분할합니다.</p>
          </div>
          <button type="button" className="split-modal-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="split-modal-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={rows === preset.rows && cols === preset.cols ? 'active' : ''}
              onClick={() => {
                setRows(preset.rows);
                setCols(preset.cols);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="split-modal-body">
          <label>
            행
            <input
              type="number"
              min={1}
              max={8}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            />
          </label>
          <label>
            열
            <input
              type="number"
              min={1}
              max={8}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            />
          </label>
        </div>

        <div className="split-modal-preview" aria-hidden="true">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="split-modal-preview-row">
              {Array.from({ length: cols }).map((__, colIndex) => (
                <span key={`cell-${rowIndex}-${colIndex}`} />
              ))}
            </div>
          ))}
        </div>

        <div className="split-modal-footer">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onApply(rows, cols)}
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

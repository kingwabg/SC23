import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScBorderPreset } from './plugins/ScTableEngine';
import './TableBorderModal.css';

interface Props {
  onClose: () => void;
  onApply: (config: {
    preset: Exclude<ScBorderPreset, 'none'>;
    color: string;
    width: string;
    style: 'solid' | 'dashed' | 'dotted' | 'double';
  }) => void;
}

const PRESETS: Array<{ label: string; value: Exclude<ScBorderPreset, 'none'> }> = [
  { label: '전체', value: 'all' },
  { label: '외곽', value: 'outside' },
  { label: '내부', value: 'inside' },
  { label: '윗선', value: 'top' },
  { label: '아랫선', value: 'bottom' },
  { label: '왼쪽선', value: 'left' },
  { label: '오른쪽선', value: 'right' },
];

export default function TableBorderModal({ onClose, onApply }: Props) {
  const [preset, setPreset] = useState<Exclude<ScBorderPreset, 'none'>>('all');
  const [color, setColor] = useState('#334155');
  const [width, setWidth] = useState('1px');
  const [style, setStyle] = useState<'solid' | 'dashed' | 'dotted' | 'double'>('solid');

  return createPortal(
    <div className="border-modal-overlay" onClick={onClose}>
      <div className="border-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="border-modal-header">
          <div>
            <h3>테두리 상세</h3>
            <p>선 범위와 색, 굵기, 종류를 한 번에 적용합니다.</p>
          </div>
          <button type="button" className="border-modal-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="border-modal-grid">
          {PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={preset === item.value ? 'active' : ''}
              onClick={() => setPreset(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="border-modal-form">
          <label>
            선 색상
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label>
            굵기
            <select value={width} onChange={(e) => setWidth(e.target.value)}>
              <option value="1px">1px</option>
              <option value="2px">2px</option>
              <option value="3px">3px</option>
              <option value="4px">4px</option>
            </select>
          </label>
          <label>
            선 종류
            <select value={style} onChange={(e) => setStyle(e.target.value as typeof style)}>
              <option value="solid">실선</option>
              <option value="dashed">점선</option>
              <option value="dotted">도트</option>
              <option value="double">이중선</option>
            </select>
          </label>
        </div>

        <div className="border-modal-preview">
          <div style={{ border: `${width} ${style} ${color}` }} />
        </div>

        <div className="border-modal-footer">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onApply({ preset, color, width, style })}
          >
            적용
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

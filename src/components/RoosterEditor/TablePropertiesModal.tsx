import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TablePropertiesModal.css';

interface Props {
  table: HTMLTableElement;
  onClose: () => void;
  onApply: (props: TableProps) => void;
}

export interface TableProps {
  width: number; // mm
  height: number; // mm
  isFixed: boolean;
  isInline: boolean;
  wrapping: 'none' | 'side' | 'topBottom' | 'behind' | 'front';
  cellPadding: { top: number; bottom: number; left: number; right: number }; // px
  margin: { top: number; bottom: number; left: number; right: number }; // mm
}

const PX_TO_MM = 0.264583;
const MM_TO_PX = 3.779528;

export default function TablePropertiesModal({ table, onClose, onApply }: Props) {
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [isFixed, setIsFixed] = useState(false);
  const [isInline, setIsInline] = useState(false);
  const [wrapping, setWrapping] = useState<TableProps['wrapping']>('none');
  const [cellPadding, setCellPadding] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [margin, setMargin] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  useEffect(() => {
    // 63.79mm 버그 해결을 위한 정밀 보정 (브라우저 배율 대응)
    const calibrator = document.createElement('div');
    calibrator.style.width = '100mm';
    calibrator.style.position = 'absolute';
    calibrator.style.visibility = 'hidden';
    document.body.appendChild(calibrator);
    const pxOf100mm = calibrator.getBoundingClientRect().width;
    document.body.removeChild(calibrator);
    
    // 현재 브라우저 렌더링 기준의 정확한 관산 비율 (1px = ? mm)
    const currentPxToMm = 100 / pxOf100mm;

    // 인라인 스타일이 있으면 우선적으로 파싱 (브라우저 계산 전 원본값 보존용)
    const styleW = table.style.width;
    const styleH = table.style.height;
    
    if (styleW && styleW.endsWith('px')) {
      setWidth(Math.round(parseFloat(styleW) * PX_TO_MM * 100) / 100);
    } else {
      const rect = table.getBoundingClientRect();
      // rect.width는 브라우저 배율이 반영된 값이므로 보정된 비율(currentPxToMm)로 환산
      setWidth(Math.round(rect.width * currentPxToMm * 100) / 100);
    }

    if (styleH && styleH.endsWith('px')) {
      setHeight(Math.round(parseFloat(styleH) * PX_TO_MM * 100) / 100);
    } else {
      const rect = table.getBoundingClientRect();
      setHeight(Math.round(rect.height * currentPxToMm * 100) / 100);
    }
    
    const display = window.getComputedStyle(table).display;
    setIsInline(display.includes('inline'));
    
    const float = window.getComputedStyle(table).float;
    if (float === 'left' || float === 'right') setWrapping('side');
    else setWrapping('none');

    const firstCell = table.querySelector('td, th');
    if (firstCell) {
      const style = window.getComputedStyle(firstCell);
      const pt = parseInt(style.paddingTop);
      setCellPadding({
        top: pt || 5,
        bottom: parseInt(style.paddingBottom) || 5,
        left: parseInt(style.paddingLeft) || 5,
        right: parseInt(style.paddingRight) || 5,
      });
    } else {
      setCellPadding({ top: 5, bottom: 5, left: 5, right: 5 });
    }
    
    const style = window.getComputedStyle(table);
    const getMm = (px: string) => {
      const val = parseFloat(px) || 0;
      return Math.round(val * currentPxToMm * 100) / 100;
    };
    
    setMargin({
      top: getMm(style.marginTop),
      bottom: getMm(style.marginBottom),
      left: getMm(style.marginLeft),
      right: getMm(style.marginRight),
    });
  }, [table]);

  const updateAllMargins = (val: number) => {
    setMargin({ top: val, bottom: val, left: val, right: val });
  };

  const updateAllPadding = (val: number) => {
    setCellPadding({ top: val, bottom: val, left: val, right: val });
  };

  const handleApply = () => {
    onApply({
      width,
      height,
      isFixed,
      isInline,
      wrapping,
      cellPadding,
      margin
    });
    onClose();
  };

  return createPortal(
    <div className="prop-modal-overlay" onClick={onClose}>
      <div className="prop-modal-content" onClick={e => e.stopPropagation()}>
        <div className="prop-modal-header">
          <span>개체 속성</span>
          <button className="prop-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="prop-modal-body">
          {/* 크기 섹션 */}
          <div className="prop-section">
            <div className="prop-section-title">크기</div>
            <div className="prop-row">
              <label>너비</label>
              <div className="prop-input-group">
                <select disabled><option>고정값</option></select>
                <div className="prop-number-input">
                  <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} />
                  <span className="unit">mm</span>
                  <div className="spinners">
                    <button onClick={() => setWidth(prev => +(prev + 1).toFixed(2))}>▴</button>
                    <button onClick={() => setWidth(prev => +(prev - 1).toFixed(2))}>▾</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="prop-row">
              <label>높이</label>
              <div className="prop-input-group">
                <select disabled><option>고정값</option></select>
                <div className="prop-number-input">
                  <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} />
                  <span className="unit">mm</span>
                  <div className="spinners">
                    <button onClick={() => setHeight(prev => +(prev + 1).toFixed(2))}>▴</button>
                    <button onClick={() => setHeight(prev => +(prev - 1).toFixed(2))}>▾</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="prop-row checkbox-row">
              <label className="checkbox-container">
                <input type="checkbox" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} />
                <span className="checkmark"></span>
                크기 고정
              </label>
            </div>
          </div>

          <div className="prop-divider" />

          {/* 바깥 여백 섹션 */}
          <div className="prop-section">
            <div className="prop-section-title">바깥 여백</div>
            <div className="margin-container">
              <div className="margin-grid">
                <div className="margin-field">
                  <label>왼쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={margin.left} onChange={e => setMargin(m => ({ ...m, left: Number(m.left % 1 === 0 ? Number(e.target.value) : Number(e.target.value).toFixed(2)) }))} />
                    <span className="unit">mm</span>
                    <div className="spinners">
                      <button onClick={() => setMargin(m => ({ ...m, left: Number((m.left + 1.0).toFixed(2)) }))}>▴</button>
                      <button onClick={() => setMargin(m => ({ ...m, left: Number(Math.max(0, m.left - 1.0).toFixed(2)) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>위쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={margin.top} onChange={e => setMargin(m => ({ ...m, top: Number(e.target.value) }))} />
                    <span className="unit">mm</span>
                    <div className="spinners">
                      <button onClick={() => setMargin(m => ({ ...m, top: Number((m.top + 1.0).toFixed(2)) }))}>▴</button>
                      <button onClick={() => setMargin(m => ({ ...m, top: Number(Math.max(0, m.top - 1.0).toFixed(2)) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>오른쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={margin.right} onChange={e => setMargin(m => ({ ...m, right: Number(e.target.value) }))} />
                    <span className="unit">mm</span>
                    <div className="spinners">
                      <button onClick={() => setMargin(m => ({ ...m, right: Number((m.right + 1.0).toFixed(2)) }))}>▴</button>
                      <button onClick={() => setMargin(m => ({ ...m, right: Number(Math.max(0, m.right - 1.0).toFixed(2)) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>아래쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={margin.bottom} onChange={e => setMargin(m => ({ ...m, bottom: Number(e.target.value) }))} />
                    <span className="unit">mm</span>
                    <div className="spinners">
                      <button onClick={() => setMargin(m => ({ ...m, bottom: Number((m.bottom + 1.0).toFixed(2)) }))}>▴</button>
                      <button onClick={() => setMargin(m => ({ ...m, bottom: Number(Math.max(0, m.bottom - 1.0).toFixed(2)) }))}>▾</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="margin-all-control">
                <label>모두</label>
                <div className="all-spinners">
                  <button onClick={() => updateAllMargins(Number((margin.top + 1.0).toFixed(2)))}>▴</button>
                  <button onClick={() => updateAllMargins(Number(Math.max(0, margin.top - 1.0).toFixed(2)))}>▾</button>
                </div>
              </div>
            </div>
          </div>

          <div className="prop-divider" />

          {/* 셀 안 여백 섹션 */}
          <div className="prop-section">
            <div className="prop-section-title">셀 안 여백</div>
            <div className="margin-container">
              <div className="margin-grid">
                <div className="margin-field">
                  <label>왼쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={cellPadding.left} onChange={e => setCellPadding(p => ({ ...p, left: Number(e.target.value) }))} />
                    <span className="unit">px</span>
                    <div className="spinners">
                      <button onClick={() => setCellPadding(p => ({ ...p, left: p.left + 1 }))}>▴</button>
                      <button onClick={() => setCellPadding(p => ({ ...p, left: Math.max(0, p.left - 1) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>위쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={cellPadding.top} onChange={e => setCellPadding(p => ({ ...p, top: Number(e.target.value) }))} />
                    <span className="unit">px</span>
                    <div className="spinners">
                      <button onClick={() => setCellPadding(p => ({ ...p, top: p.top + 1 }))}>▴</button>
                      <button onClick={() => setCellPadding(p => ({ ...p, top: Math.max(0, p.top - 1) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>오른쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={cellPadding.right} onChange={e => setCellPadding(p => ({ ...p, right: Number(e.target.value) }))} />
                    <span className="unit">px</span>
                    <div className="spinners">
                      <button onClick={() => setCellPadding(p => ({ ...p, right: p.right + 1 }))}>▴</button>
                      <button onClick={() => setCellPadding(p => ({ ...p, right: Math.max(0, p.right - 1) }))}>▾</button>
                    </div>
                  </div>
                </div>
                <div className="margin-field">
                  <label>아래쪽</label>
                  <div className="prop-number-input small">
                    <input type="number" value={cellPadding.bottom} onChange={e => setCellPadding(p => ({ ...p, bottom: Number(e.target.value) }))} />
                    <span className="unit">px</span>
                    <div className="spinners">
                      <button onClick={() => setCellPadding(p => ({ ...p, bottom: p.bottom + 1 }))}>▴</button>
                      <button onClick={() => setCellPadding(p => ({ ...p, bottom: Math.max(0, p.bottom - 1) }))}>▾</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="margin-all-control">
                <label>모두</label>
                <div className="all-spinners">
                  <button onClick={() => updateAllPadding(cellPadding.top + 1)}>▴</button>
                  <button onClick={() => updateAllPadding(Math.max(0, cellPadding.top - 1))}>▾</button>
                </div>
              </div>
            </div>
          </div>

          <div className="prop-divider" />

          {/* 위치 섹션 */}
          <div className="prop-section">
            <div className="prop-section-title">위치</div>
            <div className="prop-row checkbox-row">
              <label className="checkbox-container">
                <input type="checkbox" checked={isInline} onChange={e => setIsInline(e.target.checked)} />
                <span className="checkmark"></span>
                글자처럼 취급
              </label>
            </div>
            
            <div className="prop-row wrap-row">
              <label>본문과의 배치</label>
              <div className="wrap-icons">
                <button 
                  className={`wrap-icon ${wrapping === 'side' ? 'active' : ''}`} 
                  onClick={() => setWrapping('side')}
                  onMouseEnter={() => setHoverLabel('어울림')}
                  onMouseLeave={() => setHoverLabel(null)}
                  title="어울림"
                >
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h5M16 12h5M3 18h18M10 9h4v6h-4z" stroke="currentColor" fill="none" /></svg>
                  <div className="icon-butterfly">🦋</div>
                </button>
                <button 
                  className={`wrap-icon ${wrapping === 'none' ? 'active' : ''}`} 
                  onClick={() => setWrapping('none')}
                  onMouseEnter={() => setHoverLabel('자리차지')}
                  onMouseLeave={() => setHoverLabel(null)}
                  title="자리차지"
                >
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18M10 9h4v6h-4z" stroke="currentColor" fill="none" /></svg>
                  <div className="icon-butterfly">🦋</div>
                </button>
                <button 
                  className={`wrap-icon ${wrapping === 'behind' ? 'active' : ''}`} 
                  onClick={() => setWrapping('behind')}
                  onMouseEnter={() => setHoverLabel('글 뒤로')}
                  onMouseLeave={() => setHoverLabel(null)}
                  title="글 뒤로"
                >
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" fill="none" /></svg>
                  <div className="icon-butterfly behind">🦋</div>
                </button>
                <button 
                  className={`wrap-icon ${wrapping === 'front' ? 'active' : ''}`} 
                  onClick={() => setWrapping('front')}
                  onMouseEnter={() => setHoverLabel('글 앞으로')}
                  onMouseLeave={() => setHoverLabel(null)}
                  title="글 앞으로"
                >
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" fill="none" /></svg>
                  <div className="icon-butterfly front">🦋</div>
                </button>
              </div>
              <div className="prop-wrap-info">
                {hoverLabel ? <span className="hover-label">{hoverLabel}</span> : <span className="empty-label">&nbsp;</span>}
              </div>
              <div className="prop-input-group text-pos">
                <span>본문 위치</span>
                <select><option>양쪽</option></select>
              </div>
            </div>
          </div>
        </div>

        <div className="prop-modal-footer">
          <button className="btn-apply" onClick={handleApply}>설정</button>
          <button className="btn-cancel" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

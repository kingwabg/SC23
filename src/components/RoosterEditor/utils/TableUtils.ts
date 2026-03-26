/**
 * HWP 스타일 표 편집을 위한 정밀 단위 변환 및 보정 유틸리티
 */

// 브라우저 확대 배율(DPI) 보정 비율 계산 (100mm를 그려서 픽셀 측정)
export const getCalibrationRatio = (): number => {
  if (typeof document === 'undefined') return 0.264583;
  const calibrator = document.createElement('div');
  calibrator.style.width = '100mm';
  calibrator.style.position = 'absolute';
  calibrator.style.visibility = 'hidden';
  calibrator.style.top = '-1000px';
  document.body.appendChild(calibrator);
  const pxOf100mm = calibrator.getBoundingClientRect().width;
  document.body.removeChild(calibrator);
  return 100 / pxOf100mm; // 1px당 실질 mm 수치
};

// 기본 상수는 96DPI 기준 (1mm = 3.779528px)용으로 백업
export const PX_TO_MM_96DPI = 0.26458333333333334;
export const MM_TO_PX_96DPI = 3.779528;

/**
 * 픽셀을 현재 배율에 맞춰 mm로 변환
 */
export const pxToMm = (px: number, ratio: number = getCalibrationRatio()): number => {
  return Math.round(px * ratio * 100) / 100;
};

/**
 * mm를 현재 배율에 맞춰 픽셀로 변환
 */
export const mmToPx = (mm: number, ratio: number = getCalibrationRatio()): number => {
  const pxRatio = 1 / ratio;
  return Math.round(mm * pxRatio * 100) / 100;
};

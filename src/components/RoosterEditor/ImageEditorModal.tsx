import React from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

interface Props {
  source: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

/**
 * Filerobot 이미 편집 모달
 * - 자르기, 필터, 밝기 조절, 그리기 등 고급 편집 기능 제공
 * - 편집 완료 시 새로운 이미지를 URL로 반환
 */
const ImageEditorModal: React.FC<Props> = ({ source, onSave, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, background: 'rgba(0,0,0,0.8)' }}>
      <FilerobotImageEditor
        source={source}
        onSave={(editedImageObject: any) => {
          // 캔버스 데이터를 브라우저 URL로 변환하여 전달
          if (editedImageObject?.imageBase64) {
             onSave(editedImageObject.imageBase64);
          } else if (editedImageObject?.url) {
             onSave(editedImageObject.url);
          }
        }}
        onClose={onClose}
        annotationsCommon={{
          fill: '#ff0000',
        }}
        tabsIds={[
          TABS.ADJUST,
          TABS.FINETUNE,
          TABS.FILTER,
          TABS.ANNOTATE,
          TABS.WATERMARK,
        ]}
        defaultTabId={TABS.ADJUST}
        defaultToolId={TOOLS.CROP}
        savingPixelRatio={2}
        previewPixelRatio={window.devicePixelRatio}
        theme={{
          palette: {
            'bg-primary-light': '#333333',
            'bg-primary-dark': '#222222',
            'bg-secondary': '#444444',
            'accent-primary': '#8b5cf6', // 캔바 보라색과 깔맞춤
            'accent-primary-hover': '#7c3aed',
          },
        }}
      />
    </div>
  );
};

export default ImageEditorModal;

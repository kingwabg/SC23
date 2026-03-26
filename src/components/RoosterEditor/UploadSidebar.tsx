import React, { useState, useRef } from 'react';
import { Search, Plus, User, Folder, Upload, Video, MoreHorizontal, Mic, Edit2 } from 'lucide-react';
import { compressImage } from '../../utils/imageProcessor';
import ImageEditorModal from './ImageEditorModal';
import './UploadSidebar.css';

interface Asset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'folder';
  name: string;
}

interface Props {
  onInsertImage: (url: string) => void;
}

export default function UploadSidebar({ onInsertImage }: Props) {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'folder'>('image');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAssets: Asset[] = [];

    for (let i = 0; i < files.length; i++) {
       const file = files[i];
       if (file.type.startsWith('image/')) {
          try {
            const { url } = await compressImage(file, 1024, 0.7);
            newAssets.push({
              id: Date.now().toString() + '-' + i,
              url,
              type: 'image',
              name: file.name
            });
          } catch (err) {
            console.error('압축 실패:', err);
          }
       }
    }

    setAssets((prev: Asset[]) => [...newAssets, ...prev]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="upload-sidebar-container">
      <div className="upload-search">
        <Search className="search-icon" size={16} />
        <input type="text" placeholder="키워드, 태그, 색상 검색" />
      </div>

      <div className="upload-actions">
        <button className="btn-upload-primary" onClick={() => fileInputRef.current?.click()}>
          {isUploading ? '압축 중...' : '파일 업로드'}
        </button>
        <button className="btn-upload-more">
          <MoreHorizontal size={20} />
        </button>
        <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} hidden />
      </div>

      <button className="btn-record-direct">직접 녹화하기</button>

      <div className="upload-tabs">
        <button className={activeTab === 'image' ? 'active' : ''} onClick={() => setActiveTab('image')}>이미지</button>
        <button className={activeTab === 'video' ? 'active' : ''} onClick={() => setActiveTab('video')}>동영상</button>
        <button className={activeTab === 'folder' ? 'active' : ''} onClick={() => setActiveTab('folder')}>폴더</button>
      </div>

      <div className="asset-scroll-area">
        {activeTab === 'image' ? (
          <div className="asset-grid">
            {assets.map(asset => (
              <div 
                key={asset.id} 
                className="asset-item" 
                title={asset.name}
                draggable
                onDragStart={(e) => {
                  const html = `<img src="${asset.url}" style="max-width: 100%; border: none; outline: none; margin: 10px 0;" />`;
                  e.dataTransfer.setData('text/html', html);
                  const img = new Image();
                  img.src = asset.url;
                  e.dataTransfer.setDragImage(img, 20, 20);
                }}
              >
                <img src={asset.url} alt={asset.name} draggable="false" onClick={() => onInsertImage(asset.url)} />
                <button className="btn-edit-asset" onClick={(e) => { e.stopPropagation(); setEditingId(asset.id); }}>
                   <Edit2 size={12} />
                </button>
              </div>
            ))}
            {assets.length === 0 && !isUploading && (
              <div className="empty-assets">
                <Upload size={32} />
                <p>업로드된 이미지가 없습니다.</p>
              </div>
            )}
            {isUploading && <div className="loading-grid-item" />}
          </div>
        ) : (
          <div className="empty-assets">
             <p>준비 중...</p>
          </div>
        )}
      </div>

      {/* 이미지 편집 모달 */}
      {editingId && (
        <ImageEditorModal 
          source={assets.find((a: Asset) => a.id === editingId)?.url || ''}
          onSave={(newUrl: string) => {
            setAssets((prev: Asset[]) => prev.map((a: Asset) => a.id === editingId ? { ...a, url: newUrl } : a));
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

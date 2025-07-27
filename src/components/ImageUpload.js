import React, { useState, useCallback } from 'react';
import { Upload, X, Star } from 'lucide-react';

const ImageUpload = ({ images = [], onChange, maxImages = 5, className = '' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const processFiles = useCallback(async (files) => {
    if (!files.length) return;

    setUploading(true);
    const newImages = [];

    for (let i = 0; i < files.length && images.length + newImages.length < maxImages; i++) {
      const file = files[i];

      // ファイルタイプの検証
      if (!file.type.startsWith('image/')) {
        console.warn(`ファイル ${file.name} は画像ファイルではありません`);
        continue;
      }

      // ファイルサイズの検証 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`ファイル ${file.name} のサイズが大きすぎます (5MB以下にしてください)`);
        continue;
      }

      try {
        // ファイルをBase64に変換してプレビュー用URLを作成
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage = {
            id: generateId(),
            fileName: `${Date.now()}_${file.name}`,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url: e.target.result,
            isPrimary: images.length === 0 && newImages.length === 0,
            uploadedAt: new Date().toISOString()
          };

          newImages.push(newImage);
          
          if (newImages.length === files.length) {
            onChange([...images, ...newImages]);
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error(`ファイル ${file.name} の処理中にエラーが発生しました:`, error);
      }
    }

    if (files.length === 0) {
      setUploading(false);
    }
  }, [images, onChange, maxImages]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  }, [processFiles]);

  const removeImage = useCallback((imageId) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    // メイン画像を削除した場合、最初の残りの画像をメインにする
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isPrimary)) {
      updatedImages[0].isPrimary = true;
    }
    onChange(updatedImages);
  }, [images, onChange]);

  const setPrimaryImage = useCallback((imageId) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    onChange(updatedImages);
  }, [images, onChange]);

  const canAddMore = images.length < maxImages;

  return (
    <div className={`w-full ${className}`}>
      {/* アップロードエリア */}
      {canAddMore && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="space-y-2">
            <div className="flex justify-center">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <div className="text-gray-600">
              <p className="text-sm">
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  ファイルを選択
                </span>
                またはドラッグ＆ドロップ
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WEBP up to 5MB (最大{maxImages}枚)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 画像プレビューグリッド */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={image.url}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* 画像コントロール */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                {!image.isPrimary && (
                  <button
                    onClick={() => setPrimaryImage(image.id)}
                    className="bg-white text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-100 flex items-center space-x-1"
                  >
                    <Star className="w-3 h-3" />
                    <span>メイン</span>
                  </button>
                )}
                <button
                  onClick={() => removeImage(image.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>削除</span>
                </button>
              </div>

              {/* メインバッジ */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>メイン画像</span>
                </div>
              )}

              {/* ファイル情報 */}
              <div className="mt-2 text-xs text-gray-600 truncate">
                {image.originalName}
              </div>
              <div className="text-xs text-gray-400">
                {(image.size / 1024).toFixed(1)} KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* アップロード状況 */}
      {uploading && (
        <div className="mt-2 text-sm text-blue-600">
          アップロード中...
        </div>
      )}

      {/* 画像カウント情報 */}
      <div className="mt-2 text-xs text-gray-500">
        {images.length} / {maxImages} 枚の画像
      </div>
    </div>
  );
};

export default ImageUpload;
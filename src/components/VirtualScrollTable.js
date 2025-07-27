import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualScroll, usePerformanceMonitor } from '../utils/performance-manager';

const VirtualScrollTable = ({ 
  data = [], 
  columns = [], 
  itemHeight = 60,
  containerHeight = 400,
  onRowClick = null,
  className = '',
  enablePerformanceMonitoring = true
}) => {
  const containerRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // パフォーマンス監視
  const { markPerformance, measurePerformance } = usePerformanceMonitor({
    enabled: enablePerformanceMonitoring
  });

  // データのソート
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    markPerformance('sort-start');
    
    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    markPerformance('sort-end');
    measurePerformance('sort-duration', 'sort-start', 'sort-end');
    
    return sorted;
  }, [data, sortConfig, markPerformance, measurePerformance]);

  // 仮想スクロール設定
  const {
    handleScroll,
    visibleItems,
    totalHeight,
    containerStyle,
    contentStyle,
    getItemStyle
  } = useVirtualScroll(sortedData, itemHeight, containerHeight);

  // ソート処理
  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // ソートアイコンの取得
  const getSortIcon = useCallback((columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '⇅';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  }, [sortConfig]);

  // セルの値をフォーマット
  const formatCellValue = useCallback((value, column) => {
    if (column.formatter && typeof column.formatter === 'function') {
      return column.formatter(value);
    }
    
    // デフォルトフォーマット
    if (typeof value === 'number') {
      if (column.type === 'currency') {
        return new Intl.NumberFormat('ja-JP', {
          style: 'currency',
          currency: 'JPY'
        }).format(value);
      }
      if (column.type === 'weight') {
        return `${value.toFixed(1)}kg`;
      }
      return value.toLocaleString();
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString('ja-JP');
    }
    
    return value || '';
  }, []);

  // ヘッダーのレンダリング
  const renderHeader = () => (
    <div className="virtual-table-header">
      <div className="virtual-table-row header-row">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`virtual-table-cell header-cell ${column.sortable ? 'sortable' : ''}`}
            style={{ 
              width: column.width || 'auto',
              minWidth: column.minWidth || '100px',
              flex: column.flex || '1'
            }}
            onClick={column.sortable ? () => handleSort(column.key) : undefined}
          >
            <span className="cell-content">
              {column.title}
              {column.sortable && (
                <span className="sort-icon">
                  {getSortIcon(column.key)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // 行のレンダリング
  const renderRow = useCallback((item, index) => {
    const actualIndex = visibleItems.indexOf(item);
    
    return (
      <div
        key={item.id || index}
        className={`virtual-table-row data-row ${onRowClick ? 'clickable' : ''}`}
        style={getItemStyle(actualIndex)}
        onClick={onRowClick ? () => onRowClick(item, index) : undefined}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={`virtual-table-cell data-cell ${column.className || ''}`}
            style={{ 
              width: column.width || 'auto',
              minWidth: column.minWidth || '100px',
              flex: column.flex || '1'
            }}
          >
            <span className="cell-content">
              {formatCellValue(item[column.key], column)}
            </span>
          </div>
        ))}
      </div>
    );
  }, [visibleItems, getItemStyle, columns, formatCellValue, onRowClick]);

  return (
    <div className={`virtual-scroll-table ${className}`}>
      {renderHeader()}
      <div
        ref={containerRef}
        className="virtual-table-container"
        style={containerStyle}
        onScroll={handleScroll}
      >
        <div
          className="virtual-table-content"
          style={contentStyle}
        >
          {visibleItems.map((item, index) => renderRow(item, index))}
        </div>
      </div>
      
      {/* パフォーマンス情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && enablePerformanceMonitoring && (
        <div className="performance-info">
          <small>
            表示中: {visibleItems.length} / 全体: {sortedData.length} 件
          </small>
        </div>
      )}
    </div>
  );
};

// CSS-in-JSスタイル（index.cssに追加するためのスタイル定義）
export const virtualScrollTableStyles = `
.virtual-scroll-table {
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  overflow: hidden;
  background: white;
}

.virtual-table-header {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.virtual-table-row {
  display: flex;
  min-height: 60px;
  border-bottom: 1px solid #e5e7eb;
}

.virtual-table-row.header-row {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.virtual-table-row.data-row {
  background: white;
  transition: background-color 0.15s ease;
}

.virtual-table-row.data-row:hover {
  background: #f9fafb;
}

.virtual-table-row.clickable {
  cursor: pointer;
}

.virtual-table-cell {
  padding: 0.75rem;
  display: flex;
  align-items: center;
  border-right: 1px solid #e5e7eb;
  overflow: hidden;
}

.virtual-table-cell:last-child {
  border-right: none;
}

.virtual-table-cell.header-cell.sortable {
  cursor: pointer;
  user-select: none;
}

.virtual-table-cell.header-cell.sortable:hover {
  background: #e5e7eb;
}

.cell-content {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-icon {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.virtual-table-container {
  position: relative;
  overflow: auto;
}

.virtual-table-content {
  position: relative;
}

.performance-info {
  padding: 0.5rem;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  text-align: center;
}

/* 急ぎの注文用スタイル */
.virtual-table-row.urgent {
  background-color: #fef3c7 !important;
  border-left: 4px solid #f59e0b;
}

.virtual-table-row.urgent:hover {
  background-color: #fde68a !important;
}

/* 材質別スタイル */
.material-s14 {
  color: #3b82f6;
  font-weight: 600;
}

.material-scs {
  color: #10b981;
  font-weight: 600;
}

.material-sus304 {
  color: #f59e0b;
  font-weight: 600;
}

/* ステータス別スタイル */
.status-pending {
  color: #f59e0b;
}

.status-processing {
  color: #3b82f6;
}

.status-completed {
  color: #10b981;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .virtual-table-cell {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
  
  .virtual-table-row {
    min-height: 50px;
  }
}
`;

export default VirtualScrollTable;
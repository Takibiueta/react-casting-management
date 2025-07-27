# ステンレス鋳造管理システム - 統合ガイド

## 実装された機能の概要

このガイドでは、新しく実装された以下の機能の統合方法について説明します：

### 1. パフォーマンス最適化機能
- **VirtualScrollTable**: 大量データの効率的表示
- **CacheManager**: データキャッシュ管理
- **PerformanceMonitor**: システム性能監視

### 2. セキュリティ強化機能
- **DataValidator**: 入力データ検証
- **InputSanitizer**: XSS/SQLインジェクション対策
- **CSRFProtection**: CSRF攻撃対策
- **SecureStorage**: 暗号化ストレージ

### 3. データ永続化機能
- **IndexedDBManager**: 高度なブラウザ内DB管理
- **データ同期**: サーバーとの双方向同期
- **バックアップ機能**: 自動・手動バックアップ

### 4. リアルタイム機能
- **WebSocketManager**: リアルタイム通信
- **RealtimeDataSync**: データ変更の即座反映
- **NotificationManager**: 通知システム

### 5. 予測分析機能
- **AnalyticsEngine**: 需要予測・効率最適化
- **統計分析**: トレンド・季節性分析
- **品質予測**: 品質リスク分析

### 6. レポート機能
- **ReportGenerator**: PDF/Excel/CSV/HTML出力
- **カスタムテンプレート**: 柔軟なレポート作成
- **スケジューリング**: 自動レポート生成

## 統合手順

### ステップ1: 依存関係の確認

新機能を使用するため、以下のパッケージが必要です（既にpackage.jsonに含まれています）：

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "lucide-react": "^0.263.1",
    "pdfjs-dist": "^4.8.69",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "xlsx": "^0.18.5"
  }
}
```

### ステップ2: 基本設定の初期化

App.jsに以下の初期化コードを追加：

```javascript
import React, { useEffect } from 'react';
import { initializeSecurity } from './utils/security-utils';
import { initializeDatabase } from './utils/indexed-db-manager';
import { initializeWebSocket } from './utils/websocket-manager';
import { startCacheCleanup } from './utils/cache-utils';

function App() {
  useEffect(() => {
    // システム初期化
    const initializeSystem = async () => {
      // セキュリティ初期化
      initializeSecurity();
      
      // データベース初期化
      await initializeDatabase();
      
      // WebSocket初期化（オプション）
      // await initializeWebSocket();
      
      // キャッシュクリーンアップ開始
      const cleanupInterval = startCacheCleanup();
      
      return () => {
        clearInterval(cleanupInterval);
      };
    };

    initializeSystem();
  }, []);

  // ... 既存のコンポーネント
}
```

### ステップ3: VirtualScrollTableの統合

OrderManagementコンポーネントは既にVirtualScrollTableを使用するよう更新されていますが、他のコンポーネントでも使用できます：

```javascript
import VirtualScrollTable from './components/VirtualScrollTable';

// 使用例
<VirtualScrollTable
  data={orders}
  columns={tableColumns}
  itemHeight={70}
  containerHeight={500}
  onRowClick={handleRowClick}
  enablePerformanceMonitoring={true}
/>
```

### ステップ4: IndexedDBの統合

データ永続化のため、既存のuseLocalStorageフックをIndexedDB版に置き換え：

```javascript
// 既存
import { useOrderData } from './hooks/useLocalStorage';

// 新規
import { useOrdersDB } from './hooks/useIndexedDB';

// 使用方法は同じ
const { orders, addOrder, updateOrder, deleteOrder } = useOrdersDB();
```

### ステップ5: セキュリティ機能の統合

フォーム入力にセキュリティ検証を追加：

```javascript
import { useSecureForm } from './hooks/useSecurity';
import { DataValidator } from './utils/security-utils';

// セキュアなフォーム
const {
  formData,
  setValue,
  submitForm,
  errors,
  isValid
} = useSecureForm(initialData, DataValidator.orderSchema);
```

### ステップ6: 分析機能の統合

ダッシュボードに予測分析を追加：

```javascript
import { useAnalyticsDashboard } from './hooks/useAnalytics';

const { dashboard, kpis } = useAnalyticsDashboard(orders, products, customers);

// KPIダッシュボード表示
if (kpis) {
  return (
    <div className="analytics-dashboard">
      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>効率性</h3>
          <span>{kpis.efficiency}%</span>
        </div>
        <div className="kpi-card">
          <h3>品質スコア</h3>
          <span>{Math.round(kpis.qualityScore)}</span>
        </div>
      </div>
    </div>
  );
}
```

### ステップ7: レポート機能の統合

レポート生成ボタンを追加：

```javascript
import { useReportGenerator } from './hooks/useReports';

const { generateOrderReport, generating } = useReportGenerator();

const handleExportReport = async () => {
  try {
    const report = await generateOrderReport(orders, {
      format: 'pdf',
      includeStatistics: true
    });
    
    // 自動ダウンロード
    const blob = new Blob([report.content], { type: report.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename;
    link.click();
  } catch (error) {
    console.error('レポート生成エラー:', error);
  }
};
```

### ステップ8: リアルタイム機能の統合（オプション）

複数ユーザー環境でのリアルタイム同期：

```javascript
import { useRealtimeOrders } from './hooks/useWebSocket';

// 通常のuseOrderDataの代わりに使用
const {
  orders,
  addOrder,
  updateOrder,
  deleteOrder,
  conflicts,
  isConnected
} = useRealtimeOrders(initialOrders);

// 接続状態の表示
{isConnected && <div className="status online">🟢 オンライン</div>}
{conflicts.length > 0 && <div className="conflicts">⚠️ データ競合あり</div>}
```

## テスト手順

### 1. 基本機能テスト

```javascript
// パフォーマンステスト
console.time('large-data-render');
// 大量データ（1000件）での表示テスト
console.timeEnd('large-data-render');

// セキュリティテスト
// XSS攻撃文字列の入力テスト
const maliciousInput = '<script>alert("XSS")</script>';
// → 適切にサニタイズされることを確認

// データ永続化テスト
// ブラウザのIndexedDBに正しく保存されるかテスト
```

### 2. 統合テスト

```javascript
// データフローテスト
// 1. 注文データ入力
// 2. バリデーション
// 3. サニタイゼーション
// 4. IndexedDBへの保存
// 5. VirtualScrollTableでの表示
// 6. 分析エンジンでの処理
// 7. レポート生成

// エラーハンドリングテスト
// - ネットワーク切断時の動作
// - 不正データ入力時の動作
// - メモリ不足時の動作
```

### 3. パフォーマンステスト

```javascript
// メモリ使用量監視
const monitor = new PerformanceMonitor();
monitor.start();

// 1000件のデータで各機能をテスト
// メモリリークがないことを確認
```

## よくある問題と解決方法

### 1. VirtualScrollTableが正しく表示されない

**原因**: コンテナの高さが正しく設定されていない
**解決**: `containerHeight`プロップを明示的に指定

```javascript
<VirtualScrollTable
  containerHeight={500} // 明示的に高さを指定
  // ...
/>
```

### 2. IndexedDBが動作しない

**原因**: ブラウザがIndexedDBに対応していない、またはプライベートモード
**解決**: フォールバック処理を実装

```javascript
// utils/indexed-db-manager.js で自動的にLocalStorageにフォールバック
```

### 3. WebSocket接続が失敗する

**原因**: WebSocketサーバーが未実装
**解決**: 開発環境では無効化

```javascript
// App.js
const isDevelopment = process.env.NODE_ENV === 'development';
if (!isDevelopment) {
  await initializeWebSocket();
}
```

### 4. レポート生成が失敗する

**原因**: 大量データでメモリ不足
**解決**: ページング処理を追加

```javascript
const report = await generateOrderReport(orders.slice(0, 1000), options);
```

## パフォーマンス最適化のTips

1. **VirtualScrollTable**: 1000件以上のデータで使用
2. **CacheManager**: API結果や計算結果をキャッシュ
3. **IndexedDB**: 大量データの永続化に使用
4. **WebSocket**: リアルタイム性が必要な場合のみ使用
5. **Analytics**: 重い分析は非同期で実行

## セキュリティ考慮事項

1. **入力検証**: すべてのユーザー入力を検証
2. **CSRF対策**: フォーム送信時にトークン確認
3. **XSS対策**: 表示データのサニタイゼーション
4. **データ暗号化**: 機密データはSecureStorageを使用

## まとめ

この統合により、ステンレス鋳造管理システムは以下の機能を持つ高度なシステムになります：

- ✅ 高性能な大量データ処理
- ✅ 堅牢なセキュリティ
- ✅ 信頼性の高いデータ永続化
- ✅ リアルタイムデータ同期
- ✅ 高度な分析・予測機能  
- ✅ 柔軟なレポート生成

すべての機能は段階的に統合可能であり、既存の機能を破壊することなく拡張できます。
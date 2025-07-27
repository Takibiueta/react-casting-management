// レポート生成・印刷機能 - PDF生成、Excel出力、カスタムレポート
export class ReportGenerator {
  constructor() {
    this.templates = new Map();
    this.defaultStyles = {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0'
    };
    this.pageOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    };
  }

  // 注文レポート生成
  async generateOrderReport(orders, options = {}) {
    const {
      format = 'pdf',
      template = 'standard',
      filters = {},
      sortBy = 'orderDate',
      groupBy = null,
      includeStatistics = true,
      customFields = []
    } = options;

    // データの前処理
    const processedOrders = this._processOrderData(orders, filters, sortBy);
    
    // レポートデータの構築
    const reportData = {
      title: '注文レポート',
      generatedAt: new Date().toISOString(),
      filters: this._describeFilters(filters),
      data: processedOrders,
      statistics: includeStatistics ? this._calculateOrderStatistics(processedOrders) : null,
      groupedData: groupBy ? this._groupData(processedOrders, groupBy) : null,
      customFields
    };

    // フォーマット別生成
    switch (format) {
      case 'pdf':
        return await this._generatePDF(reportData, template);
      case 'excel':
        return await this._generateExcel(reportData, template);
      case 'csv':
        return await this._generateCSV(reportData);
      case 'html':
        return await this._generateHTML(reportData, template);
      default:
        throw new Error(`未対応のフォーマット: ${format}`);
    }
  }

  // 分析レポート生成
  async generateAnalyticsReport(analyticsData, options = {}) {
    const {
      format = 'pdf',
      sections = ['demand', 'efficiency', 'quality', 'profitability'],
      includeCharts = true,
      chartOptions = {}
    } = options;

    const reportData = {
      title: '分析レポート',
      subtitle: 'ステンレス鋳造管理システム - 包括的分析',
      generatedAt: new Date().toISOString(),
      sections: this._buildAnalyticsSections(analyticsData, sections, includeCharts),
      executive_summary: this._generateExecutiveSummary(analyticsData),
      recommendations: this._compileRecommendations(analyticsData)
    };

    switch (format) {
      case 'pdf':
        return await this._generateAnalyticsPDF(reportData, chartOptions);
      case 'html':
        return await this._generateAnalyticsHTML(reportData);
      default:
        throw new Error(`分析レポートは${format}フォーマットに対応していません`);
    }
  }

  // カスタムレポート生成
  async generateCustomReport(data, template, options = {}) {
    const {
      format = 'pdf',
      customStyles = {},
      variables = {},
      includeHeader = true,
      includeFooter = true
    } = options;

    const compiledTemplate = this._compileTemplate(template, data, variables);
    const styles = { ...this.defaultStyles, ...customStyles };

    const reportData = {
      content: compiledTemplate,
      styles,
      includeHeader,
      includeFooter,
      generatedAt: new Date().toISOString()
    };

    switch (format) {
      case 'pdf':
        return await this._generateCustomPDF(reportData);
      case 'html':
        return await this._generateCustomHTML(reportData);
      default:
        throw new Error(`カスタムレポートは${format}フォーマットに対応していません`);
    }
  }

  // バッチ最適化レポート生成
  async generateBatchOptimizationReport(optimizationData, options = {}) {
    const { format = 'pdf', includeDetails = true } = options;

    const reportData = {
      title: 'バッチ最適化レポート',
      generatedAt: new Date().toISOString(),
      summary: this._createOptimizationSummary(optimizationData),
      batches: optimizationData.materialOptimization || {},
      efficiency: optimizationData.overallEfficiency || {},
      recommendations: optimizationData.recommendations || [],
      includeDetails
    };

    switch (format) {
      case 'pdf':
        return await this._generateOptimizationPDF(reportData);
      case 'excel':
        return await this._generateOptimizationExcel(reportData);
      default:
        throw new Error(`最適化レポートは${format}フォーマットに対応していません`);
    }
  }

  // テンプレート管理
  registerTemplate(name, template) {
    this.templates.set(name, template);
  }

  getTemplate(name) {
    return this.templates.get(name);
  }

  // プライベートメソッド - データ処理
  _processOrderData(orders, filters, sortBy) {
    let processed = [...orders];

    // フィルター適用
    if (filters.status) {
      processed = processed.filter(order => order.status === filters.status);
    }
    if (filters.material) {
      processed = processed.filter(order => order.material === filters.material);
    }
    if (filters.customer) {
      processed = processed.filter(order => order.customer.includes(filters.customer));
    }
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      processed = processed.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= new Date(start) && orderDate <= new Date(end);
      });
    }

    // ソート
    processed.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy.includes('Date')) {
        return new Date(aValue) - new Date(bValue);
      }
      
      if (typeof aValue === 'number') {
        return aValue - bValue;
      }
      
      return String(aValue).localeCompare(String(bValue));
    });

    return processed;
  }

  _calculateOrderStatistics(orders) {
    const totalOrders = orders.length;
    const totalWeight = orders.reduce((sum, order) => sum + (order.totalWeight || 0), 0);
    const totalValue = orders.reduce((sum, order) => sum + ((order.unitPrice || 0) * (order.quantity || 0)), 0);

    // ステータス別集計
    const statusCounts = orders.reduce((counts, order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
      return counts;
    }, {});

    // 材質別集計
    const materialStats = orders.reduce((stats, order) => {
      const material = order.material || 'unknown';
      if (!stats[material]) {
        stats[material] = { count: 0, weight: 0, value: 0 };
      }
      stats[material].count += 1;
      stats[material].weight += order.totalWeight || 0;
      stats[material].value += (order.unitPrice || 0) * (order.quantity || 0);
      return stats;
    }, {});

    // 顧客別集計
    const customerStats = orders.reduce((stats, order) => {
      const customer = order.customer || 'unknown';
      if (!stats[customer]) {
        stats[customer] = { count: 0, weight: 0, value: 0 };
      }
      stats[customer].count += 1;
      stats[customer].weight += order.totalWeight || 0;
      stats[customer].value += (order.unitPrice || 0) * (order.quantity || 0);
      return stats;
    }, {});

    return {
      totalOrders,
      totalWeight,
      totalValue,
      averageOrderValue: totalValue / totalOrders,
      averageOrderWeight: totalWeight / totalOrders,
      statusCounts,
      materialStats,
      customerStats
    };
  }

  _groupData(data, groupBy) {
    return data.reduce((groups, item) => {
      const key = item[groupBy] || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }

  _describeFilters(filters) {
    const descriptions = [];
    
    if (filters.status) descriptions.push(`ステータス: ${filters.status}`);
    if (filters.material) descriptions.push(`材質: ${filters.material}`);
    if (filters.customer) descriptions.push(`顧客: ${filters.customer}`);
    if (filters.dateRange) {
      descriptions.push(`期間: ${filters.dateRange.start} ～ ${filters.dateRange.end}`);
    }
    
    return descriptions.length > 0 ? descriptions.join(', ') : '全てのデータ';
  }

  // プライベートメソッド - PDF生成
  async _generatePDF(reportData, template) {
    // PDFライブラリ（jsPDFやPDFKitなど）を使用した実装
    // ここでは簡易的な実装例を示す
    
    const pdfContent = this._createPDFContent(reportData, template);
    
    return {
      format: 'pdf',
      content: pdfContent,
      filename: `order-report-${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  _createPDFContent(reportData, template) {
    // PDFの基本構造を作成
    const header = this._createPDFHeader(reportData);
    const body = this._createPDFBody(reportData, template);
    const footer = this._createPDFFooter(reportData);

    return {
      pageSize: this.pageOptions.format,
      pageOrientation: this.pageOptions.orientation,
      pageMargins: [
        this.pageOptions.margin.left,
        this.pageOptions.margin.top,
        this.pageOptions.margin.right,
        this.pageOptions.margin.bottom
      ],
      content: [header, body, footer],
      styles: this._getPDFStyles(),
      defaultStyle: {
        font: 'NotoSansCJK', // 日本語対応フォント
        fontSize: this.defaultStyles.fontSize
      }
    };
  }

  _createPDFHeader(reportData) {
    return {
      columns: [
        {
          text: reportData.title,
          style: 'header',
          alignment: 'left'
        },
        {
          text: `生成日時: ${new Date(reportData.generatedAt).toLocaleString('ja-JP')}`,
          style: 'headerInfo',
          alignment: 'right'
        }
      ],
      margin: [0, 0, 0, 20]
    };
  }

  _createPDFBody(reportData, template) {
    const content = [];

    // フィルター情報
    if (reportData.filters) {
      content.push({
        text: `抽出条件: ${reportData.filters}`,
        style: 'filterInfo',
        margin: [0, 0, 0, 10]
      });
    }

    // 統計情報
    if (reportData.statistics) {
      content.push(this._createStatisticsSection(reportData.statistics));
    }

    // データテーブル
    content.push(this._createDataTable(reportData.data));

    // グループ化データ
    if (reportData.groupedData) {
      content.push(this._createGroupedDataSection(reportData.groupedData));
    }

    return content;
  }

  _createStatisticsSection(statistics) {
    const statsTable = {
      table: {
        headerRows: 1,
        widths: ['*', '*'],
        body: [
          ['項目', '値'],
          ['総注文数', statistics.totalOrders.toLocaleString()],
          ['総重量', `${statistics.totalWeight.toLocaleString()}kg`],
          ['総金額', `¥${statistics.totalValue.toLocaleString()}`],
          ['平均注文金額', `¥${Math.round(statistics.averageOrderValue).toLocaleString()}`],
          ['平均注文重量', `${statistics.averageOrderWeight.toFixed(1)}kg`]
        ]
      },
      style: 'statisticsTable',
      margin: [0, 10, 0, 20]
    };

    return {
      text: '統計情報',
      style: 'sectionHeader',
      margin: [0, 0, 0, 10],
      table: statsTable
    };
  }

  _createDataTable(data) {
    if (!data || data.length === 0) {
      return { text: 'データがありません', style: 'noData' };
    }

    const headers = ['注文番号', '顧客名', '品名', '材質', '数量', '重量', 'ステータス', '納期'];
    const body = [headers];

    data.forEach(order => {
      body.push([
        order.orderNumber || '',
        order.customer || '',
        order.productName || '',
        order.material || '',
        `${order.quantity || 0}個`,
        `${order.totalWeight || 0}kg`,
        this._translateStatus(order.status),
        order.deliveryDate || ''
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', 'auto', 'auto', 'auto', 'auto', '*'],
        body: body
      },
      style: 'dataTable',
      margin: [0, 10, 0, 0]
    };
  }

  _translateStatus(status) {
    const translations = {
      'pending': '未着手',
      'processing': '進行中',
      'completed': '完了',
      'cancelled': 'キャンセル'
    };
    return translations[status] || status;
  }

  _createPDFFooter(reportData) {
    return {
      text: 'ステンレス鋳造管理システム - 自動生成レポート',
      style: 'footer',
      alignment: 'center',
      margin: [0, 20, 0, 0]
    };
  }

  _getPDFStyles() {
    return {
      header: {
        fontSize: 18,
        bold: true,
        color: this.defaultStyles.primaryColor
      },
      headerInfo: {
        fontSize: 10,
        color: this.defaultStyles.secondaryColor
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: this.defaultStyles.primaryColor,
        margin: [0, 10, 0, 5]
      },
      filterInfo: {
        fontSize: 10,
        italics: true,
        color: this.defaultStyles.secondaryColor
      },
      dataTable: {
        fontSize: 9,
        margin: [0, 5, 0, 15]
      },
      statisticsTable: {
        fontSize: 10
      },
      footer: {
        fontSize: 8,
        color: this.defaultStyles.secondaryColor
      },
      noData: {
        fontSize: 12,
        italics: true,
        alignment: 'center',
        color: this.defaultStyles.secondaryColor
      }
    };
  }

  // プライベートメソッド - Excel生成
  async _generateExcel(reportData, template) {
    const workbook = this._createExcelWorkbook(reportData);
    
    return {
      format: 'excel',
      content: workbook,
      filename: `order-report-${new Date().toISOString().split('T')[0]}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  _createExcelWorkbook(reportData) {
    const worksheets = [];

    // メインデータシート
    const mainSheet = this._createMainDataSheet(reportData);
    worksheets.push({ name: '注文データ', data: mainSheet });

    // 統計シート
    if (reportData.statistics) {
      const statsSheet = this._createStatisticsSheet(reportData.statistics);
      worksheets.push({ name: '統計情報', data: statsSheet });
    }

    // グループ化データシート
    if (reportData.groupedData) {
      Object.entries(reportData.groupedData).forEach(([groupName, groupData]) => {
        const groupSheet = this._createGroupDataSheet(groupData);
        worksheets.push({ name: groupName, data: groupSheet });
      });
    }

    return {
      worksheets,
      properties: {
        title: reportData.title,
        subject: 'ステンレス鋳造管理システム レポート',
        creator: 'Cast Management System',
        created: new Date(reportData.generatedAt)
      }
    };
  }

  _createMainDataSheet(reportData) {
    const headers = [
      '注文番号', '顧客名', '品番', '品名', '材質', 
      '単重量', '数量', '総重量', '注文日', '納期', 'ステータス', '備考'
    ];

    const rows = [headers];

    reportData.data.forEach(order => {
      rows.push([
        order.orderNumber || '',
        order.customer || '',
        order.productCode || '',
        order.productName || '',
        order.material || '',
        order.unitWeight || 0,
        order.quantity || 0,
        order.totalWeight || 0,
        order.orderDate || '',
        order.deliveryDate || '',
        this._translateStatus(order.status),
        order.notes || ''
      ]);
    });

    return {
      rows,
      formatting: {
        headerRow: {
          font: { bold: true },
          fill: { fgColor: { rgb: 'FFE6F2FF' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        },
        dataRows: {
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
      }
    };
  }

  _createStatisticsSheet(statistics) {
    const rows = [
      ['統計項目', '値'],
      ['総注文数', statistics.totalOrders],
      ['総重量(kg)', statistics.totalWeight],
      ['総金額(円)', statistics.totalValue],
      ['平均注文金額(円)', Math.round(statistics.averageOrderValue)],
      ['平均注文重量(kg)', parseFloat(statistics.averageOrderWeight.toFixed(1))],
      [],
      ['ステータス別内訳', ''],
      ...Object.entries(statistics.statusCounts).map(([status, count]) => [
        this._translateStatus(status), count
      ])
    ];

    return { rows };
  }

  // プライベートメソッド - CSV生成
  async _generateCSV(reportData) {
    const headers = [
      '注文番号', '顧客名', '品番', '品名', '材質', 
      '単重量', '数量', '総重量', '注文日', '納期', 'ステータス', '備考'
    ];

    const csvContent = [
      headers.join(','),
      ...reportData.data.map(order => [
        this._escapeCsvValue(order.orderNumber || ''),
        this._escapeCsvValue(order.customer || ''),
        this._escapeCsvValue(order.productCode || ''),
        this._escapeCsvValue(order.productName || ''),
        this._escapeCsvValue(order.material || ''),
        order.unitWeight || 0,
        order.quantity || 0,
        order.totalWeight || 0,
        order.orderDate || '',
        order.deliveryDate || '',
        this._translateStatus(order.status),
        this._escapeCsvValue(order.notes || '')
      ].join(','))
    ].join('\n');

    return {
      format: 'csv',
      content: csvContent,
      filename: `order-report-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv'
    };
  }

  _escapeCsvValue(value) {
    if (typeof value !== 'string') return value;
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // プライベートメソッド - HTML生成
  async _generateHTML(reportData, template) {
    const htmlContent = this._createHTMLContent(reportData, template);
    
    return {
      format: 'html',
      content: htmlContent,
      filename: `order-report-${new Date().toISOString().split('T')[0]}.html`,
      mimeType: 'text/html'
    };
  }

  _createHTMLContent(reportData, template) {
    const styles = this._getHTMLStyles();
    const header = this._createHTMLHeader(reportData);
    const body = this._createHTMLBody(reportData);
    const footer = this._createHTMLFooter(reportData);

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportData.title}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="report-container">
        ${header}
        ${body}
        ${footer}
    </div>
</body>
</html>`;
  }

  _getHTMLStyles() {
    return `
        body {
            font-family: ${this.defaultStyles.fontFamily};
            font-size: ${this.defaultStyles.fontSize}px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: ${this.defaultStyles.backgroundColor};
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid ${this.defaultStyles.primaryColor};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: ${this.defaultStyles.primaryColor};
            margin: 0;
            font-size: 24px;
        }
        .header .meta {
            color: ${this.defaultStyles.secondaryColor};
            font-size: 14px;
            margin-top: 10px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: ${this.defaultStyles.primaryColor};
            border-bottom: 1px solid ${this.defaultStyles.borderColor};
            padding-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid ${this.defaultStyles.borderColor};
        }
        th {
            background-color: #f8fafc;
            font-weight: bold;
            color: ${this.defaultStyles.primaryColor};
        }
        tr:hover {
            background-color: #f8fafc;
        }
        .statistics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid ${this.defaultStyles.primaryColor};
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: ${this.defaultStyles.primaryColor};
        }
        .stat-label {
            color: ${this.defaultStyles.secondaryColor};
            margin-top: 5px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid ${this.defaultStyles.borderColor};
            text-align: center;
            color: ${this.defaultStyles.secondaryColor};
            font-size: 12px;
        }
        @media print {
            body { padding: 0; }
            .report-container { box-shadow: none; }
        }
    `;
  }

  _createHTMLHeader(reportData) {
    return `
        <div class="header">
            <h1>${reportData.title}</h1>
            <div class="meta">
                生成日時: ${new Date(reportData.generatedAt).toLocaleString('ja-JP')}
                ${reportData.filters ? `<br>抽出条件: ${reportData.filters}` : ''}
            </div>
        </div>
    `;
  }

  _createHTMLBody(reportData) {
    let content = '';

    // 統計情報
    if (reportData.statistics) {
      content += this._createHTMLStatisticsSection(reportData.statistics);
    }

    // データテーブル
    content += this._createHTMLDataTable(reportData.data);

    return content;
  }

  _createHTMLStatisticsSection(statistics) {
    return `
        <div class="section">
            <h2>統計情報</h2>
            <div class="statistics-grid">
                <div class="stat-card">
                    <div class="stat-value">${statistics.totalOrders.toLocaleString()}</div>
                    <div class="stat-label">総注文数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${statistics.totalWeight.toLocaleString()}kg</div>
                    <div class="stat-label">総重量</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${statistics.totalValue.toLocaleString()}</div>
                    <div class="stat-label">総金額</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${Math.round(statistics.averageOrderValue).toLocaleString()}</div>
                    <div class="stat-label">平均注文金額</div>
                </div>
            </div>
        </div>
    `;
  }

  _createHTMLDataTable(data) {
    if (!data || data.length === 0) {
      return '<div class="section"><p>データがありません</p></div>';
    }

    const tableRows = data.map(order => `
        <tr>
            <td>${order.orderNumber || ''}</td>
            <td>${order.customer || ''}</td>
            <td>${order.productName || ''}</td>
            <td>${order.material || ''}</td>
            <td>${order.quantity || 0}個</td>
            <td>${order.totalWeight || 0}kg</td>
            <td>${this._translateStatus(order.status)}</td>
            <td>${order.deliveryDate || ''}</td>
        </tr>
    `).join('');

    return `
        <div class="section">
            <h2>注文データ</h2>
            <table>
                <thead>
                    <tr>
                        <th>注文番号</th>
                        <th>顧客名</th>
                        <th>品名</th>
                        <th>材質</th>
                        <th>数量</th>
                        <th>重量</th>
                        <th>ステータス</th>
                        <th>納期</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
  }

  _createHTMLFooter(reportData) {
    return `
        <div class="footer">
            <p>ステンレス鋳造管理システム - 自動生成レポート</p>
        </div>
    `;
  }

  // ユーティリティメソッド
  _compileTemplate(template, data, variables) {
    // 簡易的なテンプレートエンジン実装
    let compiled = template;
    
    // 変数の置換
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      compiled = compiled.replace(regex, value);
    });

    // データの置換
    if (data) {
      compiled = compiled.replace(/{{data\.(\w+)}}/g, (match, property) => {
        return data[property] || '';
      });
    }

    return compiled;
  }

  // 設定メソッド
  setDefaultStyles(styles) {
    this.defaultStyles = { ...this.defaultStyles, ...styles };
  }

  setPageOptions(options) {
    this.pageOptions = { ...this.pageOptions, ...options };
  }
}

// デフォルトインスタンス
export const reportGenerator = new ReportGenerator();

// レポートテンプレート定義
export const reportTemplates = {
  orderSummary: {
    name: '注文サマリー',
    sections: ['header', 'statistics', 'data']
  },
  
  detailedOrder: {
    name: '詳細注文レポート',
    sections: ['header', 'filters', 'statistics', 'data', 'groupedData']
  },
  
  analyticsReport: {
    name: '分析レポート',
    sections: ['header', 'executiveSummary', 'demandForecast', 'efficiency', 'quality']
  }
};

// ユーティリティ関数
export const reportUtils = {
  // ファイルダウンロード
  downloadReport: (reportResult) => {
    const blob = new Blob([reportResult.content], { type: reportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = reportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 印刷プレビューを開く
  openPrintPreview: (htmlContent) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
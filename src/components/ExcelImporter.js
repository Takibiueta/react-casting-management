import React, { useState } from 'react';
import { FileSpreadsheet, Upload, X, CheckCircle } from 'lucide-react';

const ExcelImporter = ({ onDataImported }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [file, setFile] = useState(null);
  const [dataType, setDataType] = useState('orders');

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      alert('Excel (.xlsx, .xls) またはCSVファイルを選択してください。');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      // Simulate Excel/CSV processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock imported data based on selected type
      let mockData = [];
      
      if (dataType === 'orders') {
        mockData = [
          {
            orderNumber: 'EX001',
            customer: 'Excelテスト会社1',
            productCode: 'EX-001',
            productName: 'Excelから取り込まれた製品1',
            material: 'SCS',
            unitWeight: 12.3,
            quantity: 5,
            orderDate: '2024-12-01',
            deliveryDate: '2025-02-15',
            status: 'pending',
            notes: 'Excelから一括取り込み'
          },
          {
            orderNumber: 'EX002',
            customer: 'Excelテスト会社2',
            productCode: 'EX-002',
            productName: 'Excelから取り込まれた製品2',
            material: 'S14',
            unitWeight: 8.7,
            quantity: 10,
            orderDate: '2024-12-02',
            deliveryDate: '2025-02-20',
            status: 'pending',
            notes: 'Excelから一括取り込み'
          }
        ];
      } else if (dataType === 'products') {
        mockData = [
          {
            productCode: 'EX-P001',
            productName: 'Excel製品1',
            category: 'コネクタ',
            material: 'S14',
            unitWeight: 15.2,
            standardPrice: 12000,
            description: 'Excelから取り込まれた製品',
            status: 'active'
          }
        ];
      } else if (dataType === 'customers') {
        mockData = [
          {
            customerCode: 'EX-C001',
            companyName: 'Excel取引先1',
            contactPerson: 'Excel太郎',
            department: 'Excel部',
            email: 'excel@test.com',
            phone: '03-1234-5678',
            status: 'active'
          }
        ];
      }

      setImportedData(mockData);
    } catch (error) {
      console.error('Excel処理エラー:', error);
      alert('Excel処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportData = () => {
    if (importedData && importedData.length > 0) {
      onDataImported(importedData, dataType);
      setIsModalOpen(false);
      resetModal();
      alert(`${importedData.length}件のデータを取り込みました。`);
    }
  };

  const resetModal = () => {
    setFile(null);
    setImportedData(null);
    setIsProcessing(false);
    setDataType('orders');
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel取り込み
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-green-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6" />
                Excel・CSV取り込み
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); resetModal(); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {!file && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">取り込みデータ種別</label>
                    <select
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="orders">注文データ</option>
                      <option value="products">製品データ</option>
                      <option value="customers">取引先データ</option>
                    </select>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Excel・CSVファイルを選択してください</p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      対応形式: .xlsx, .xls, .csv
                    </p>
                  </div>
                </div>
              )}

              {file && isProcessing && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">ファイルを解析中...</p>
                  <p className="text-sm text-gray-500 mt-2">ファイル: {file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">種別: {
                    dataType === 'orders' ? '注文データ' :
                    dataType === 'products' ? '製品データ' :
                    '取引先データ'
                  }</p>
                </div>
              )}

              {file && importedData && !isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">データ取り込み準備完了</span>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-3">
                      取り込み予定データ: {importedData.length}件
                    </h4>
                    
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-green-100">
                          <tr>
                            {dataType === 'orders' && (
                              <>
                                <th className="px-2 py-1 text-left">注文番号</th>
                                <th className="px-2 py-1 text-left">顧客名</th>
                                <th className="px-2 py-1 text-left">品名</th>
                                <th className="px-2 py-1 text-left">材質</th>
                                <th className="px-2 py-1 text-left">重量</th>
                              </>
                            )}
                            {dataType === 'products' && (
                              <>
                                <th className="px-2 py-1 text-left">製品コード</th>
                                <th className="px-2 py-1 text-left">製品名</th>
                                <th className="px-2 py-1 text-left">カテゴリ</th>
                                <th className="px-2 py-1 text-left">材質</th>
                                <th className="px-2 py-1 text-left">重量</th>
                              </>
                            )}
                            {dataType === 'customers' && (
                              <>
                                <th className="px-2 py-1 text-left">取引先コード</th>
                                <th className="px-2 py-1 text-left">会社名</th>
                                <th className="px-2 py-1 text-left">担当者</th>
                                <th className="px-2 py-1 text-left">連絡先</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {importedData.map((item, index) => (
                            <tr key={index} className="border-b border-green-200">
                              {dataType === 'orders' && (
                                <>
                                  <td className="px-2 py-1">{item.orderNumber}</td>
                                  <td className="px-2 py-1">{item.customer}</td>
                                  <td className="px-2 py-1">{item.productName}</td>
                                  <td className="px-2 py-1">{item.material}</td>
                                  <td className="px-2 py-1">{item.unitWeight * item.quantity}kg</td>
                                </>
                              )}
                              {dataType === 'products' && (
                                <>
                                  <td className="px-2 py-1">{item.productCode}</td>
                                  <td className="px-2 py-1">{item.productName}</td>
                                  <td className="px-2 py-1">{item.category}</td>
                                  <td className="px-2 py-1">{item.material}</td>
                                  <td className="px-2 py-1">{item.unitWeight}kg</td>
                                </>
                              )}
                              {dataType === 'customers' && (
                                <>
                                  <td className="px-2 py-1">{item.customerCode}</td>
                                  <td className="px-2 py-1">{item.companyName}</td>
                                  <td className="px-2 py-1">{item.contactPerson}</td>
                                  <td className="px-2 py-1">{item.email}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => { setIsModalOpen(false); resetModal(); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleImportData}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {importedData.length}件を取り込み
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelImporter;
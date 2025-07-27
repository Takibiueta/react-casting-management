import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Copy, Printer, Save, X, Clock, CheckSquare } from 'lucide-react';

const WorkflowTemplate = ({ products, onSaveTemplate, templates = [], onUpdateTemplate, onDeleteTemplate }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newTemplate, setNewTemplate] = useState({
    id: '',
    name: '',
    productCode: '',
    productName: '',
    description: '',
    steps: [
      {
        id: 1,
        name: '準備・段取り',
        description: '材料準備、型の設置、設備点検',
        estimatedTime: 30,
        checkPoints: ['材料確認', '型の状態確認', '設備の動作確認'],
        tools: ['型', '材料', '測定器'],
        safetyNotes: '安全装備着用確認'
      }
    ],
    totalEstimatedTime: 30,
    createdAt: '',
    updatedAt: ''
  });

  // 標準工程テンプレート
  const standardSteps = {
    casting: [
      {
        id: 1,
        name: '準備・段取り',
        description: '材料準備、型の設置、設備点検',
        estimatedTime: 30,
        checkPoints: ['材料確認', '型の状態確認', '設備の動作確認'],
        tools: ['型', '材料', '測定器'],
        safetyNotes: '安全装備着用確認'
      },
      {
        id: 2,
        name: '溶解',
        description: 'ステンレス材料の溶解作業',
        estimatedTime: 90,
        checkPoints: ['温度確認', '成分確認', '不純物除去'],
        tools: ['溶解炉', '温度計', '成分分析器'],
        safetyNotes: '高温注意、防護服着用'
      },
      {
        id: 3,
        name: '鋳造',
        description: '溶解金属を型に注入',
        estimatedTime: 45,
        checkPoints: ['注入速度', '温度管理', '気泡確認'],
        tools: ['鋳型', '注入器具'],
        safetyNotes: '高温金属注意'
      },
      {
        id: 4,
        name: '冷却・脱型',
        description: '冷却後の脱型作業',
        estimatedTime: 120,
        checkPoints: ['冷却時間', '収縮確認', '外観確認'],
        tools: ['脱型器具', '検査治具'],
        safetyNotes: '重量物取扱注意'
      },
      {
        id: 5,
        name: '仕上げ加工',
        description: 'バリ取り、研磨、仕上げ',
        estimatedTime: 60,
        checkPoints: ['寸法確認', '表面粗さ', '外観品質'],
        tools: ['研磨機', '測定器', 'バリ取り工具'],
        safetyNotes: '回転機械注意、保護具着用'
      },
      {
        id: 6,
        name: '検査',
        description: '寸法検査、外観検査、品質確認',
        estimatedTime: 30,
        checkPoints: ['寸法公差', '表面欠陥', '材質確認'],
        tools: ['測定器', '検査治具', '顕微鏡'],
        safetyNotes: '測定器取扱注意'
      }
    ]
  };

  const handleAddStep = () => {
    const newStep = {
      id: newTemplate.steps.length + 1,
      name: '',
      description: '',
      estimatedTime: 0,
      checkPoints: [''],
      tools: [''],
      safetyNotes: ''
    };
    setNewTemplate({
      ...newTemplate,
      steps: [...newTemplate.steps, newStep]
    });
  };

  const handleRemoveStep = (stepId) => {
    setNewTemplate({
      ...newTemplate,
      steps: newTemplate.steps.filter(step => step.id !== stepId)
    });
  };

  const handleStepChange = (stepId, field, value) => {
    setNewTemplate({
      ...newTemplate,
      steps: newTemplate.steps.map(step =>
        step.id === stepId ? { ...step, [field]: value } : step
      )
    });
  };

  const handleCheckPointChange = (stepId, index, value) => {
    setNewTemplate({
      ...newTemplate,
      steps: newTemplate.steps.map(step =>
        step.id === stepId 
          ? { 
              ...step, 
              checkPoints: step.checkPoints.map((cp, i) => i === index ? value : cp)
            }
          : step
      )
    });
  };

  const handleAddCheckPoint = (stepId) => {
    setNewTemplate({
      ...newTemplate,
      steps: newTemplate.steps.map(step =>
        step.id === stepId 
          ? { ...step, checkPoints: [...step.checkPoints, ''] }
          : step
      )
    });
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.productCode) {
      alert('テンプレート名と製品コードを入力してください。');
      return;
    }

    const totalTime = newTemplate.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
    const templateData = {
      ...newTemplate,
      id: newTemplate.id || `template_${Date.now()}`,
      totalEstimatedTime: totalTime,
      createdAt: newTemplate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingTemplate) {
      onUpdateTemplate(templateData);
    } else {
      onSaveTemplate(templateData);
    }

    setIsModalOpen(false);
    setEditingTemplate(null);
    resetTemplate();
  };

  const handleEditTemplate = (template) => {
    setNewTemplate(template);
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCopyTemplate = (template) => {
    setNewTemplate({
      ...template,
      id: '',
      name: `${template.name} (コピー)`,
      createdAt: '',
      updatedAt: ''
    });
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const resetTemplate = () => {
    setNewTemplate({
      id: '',
      name: '',
      productCode: '',
      productName: '',
      description: '',
      steps: [standardSteps.casting[0]], // デフォルトで準備工程を追加
      totalEstimatedTime: 30,
      createdAt: '',
      updatedAt: ''
    });
  };

  const handlePrintWorkflow = (template) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>黒石鋳工所</h1>
          <h2>作業工程表</h2>
          <h3>${template.name}</h3>
        </div>
        
        <div style="margin-bottom: 20px; border: 1px solid #ccc; padding: 15px;">
          <h3>製品情報</h3>
          <p><strong>製品コード:</strong> ${template.productCode}</p>
          <p><strong>製品名:</strong> ${template.productName}</p>
          <p><strong>説明:</strong> ${template.description}</p>
          <p><strong>予想作業時間:</strong> ${template.totalEstimatedTime}分</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>作業工程</h3>
          ${template.steps.map((step, index) => `
            <div style="border: 1px solid #ddd; margin-bottom: 15px; padding: 15px; page-break-inside: avoid;">
              <h4>工程 ${index + 1}: ${step.name} (${step.estimatedTime}分)</h4>
              <p><strong>作業内容:</strong> ${step.description}</p>
              
              <div style="margin: 10px 0;">
                <strong>チェックポイント:</strong>
                <ul>
                  ${step.checkPoints.map(cp => `<li>${cp}</li>`).join('')}
                </ul>
              </div>
              
              <div style="margin: 10px 0;">
                <strong>使用工具:</strong> ${step.tools.join(', ')}
              </div>
              
              <div style="margin: 10px 0; color: red;">
                <strong>安全注意事項:</strong> ${step.safetyNotes}
              </div>
              
              <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <strong>作業確認:</strong>
                <span style="margin-left: 20px;">開始時刻: ___:___</span>
                <span style="margin-left: 20px;">完了時刻: ___:___</span>
                <span style="margin-left: 20px;">作業者: _______________</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 15px;">
          <p><strong>作成日:</strong> ${new Date().toLocaleDateString('ja-JP')}</p>
          <p><strong>承認者:</strong> _______________</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📋 作業工程表テンプレート</h2>
          <button
            onClick={() => { resetTemplate(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規テンプレート
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="テンプレート名・製品コードで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <div className="text-sm text-gray-600">
            {filteredTemplates.length}件のテンプレート
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="編集"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopyTemplate(template)}
                    className="text-green-600 hover:text-green-800 p-1"
                    title="コピー"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePrintWorkflow(template)}
                    className="text-purple-600 hover:text-purple-800 p-1"
                    title="印刷"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <p><strong>製品:</strong> {template.productCode} - {template.productName}</p>
                <p><strong>工程数:</strong> {template.steps.length}</p>
                <p><strong>予想時間:</strong> {template.totalEstimatedTime}分</p>
              </div>
              
              <p className="text-sm text-gray-700">{template.description}</p>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>作業工程表テンプレートがありません</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h3 className="text-xl font-bold">
                {editingTemplate ? 'テンプレート編集' : '新規テンプレート作成'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingTemplate(null); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">テンプレート名 *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: ステンレス鋳造標準工程"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">製品コード *</label>
                  <input
                    type="text"
                    value={newTemplate.productCode}
                    onChange={(e) => setNewTemplate({...newTemplate, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: P815-110-0162"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">製品名</label>
                  <input
                    type="text"
                    value={newTemplate.productName}
                    onChange={(e) => setNewTemplate({...newTemplate, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: コネクタ VLN-15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">説明</label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="テンプレートの説明"
                  />
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">作業工程</h4>
                  <button
                    onClick={handleAddStep}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    工程追加
                  </button>
                </div>

                {newTemplate.steps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium">工程 {index + 1}</h5>
                      {newTemplate.steps.length > 1 && (
                        <button
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">工程名</label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => handleStepChange(step.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">予想時間（分）</label>
                        <input
                          type="number"
                          value={step.estimatedTime}
                          onChange={(e) => handleStepChange(step.id, 'estimatedTime', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">作業内容</label>
                      <textarea
                        value={step.description}
                        onChange={(e) => handleStepChange(step.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">チェックポイント</label>
                      {step.checkPoints.map((cp, cpIndex) => (
                        <div key={cpIndex} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={cp}
                            onChange={(e) => handleCheckPointChange(step.id, cpIndex, e.target.value)}
                            className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="チェックポイントを入力"
                          />
                          {step.checkPoints.length > 1 && (
                            <button
                              onClick={() => {
                                const newCheckPoints = step.checkPoints.filter((_, i) => i !== cpIndex);
                                handleStepChange(step.id, 'checkPoints', newCheckPoints);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddCheckPoint(step.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + チェックポイント追加
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">使用工具</label>
                        <input
                          type="text"
                          value={step.tools.join(', ')}
                          onChange={(e) => handleStepChange(step.id, 'tools', e.target.value.split(', '))}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="工具をカンマ区切りで入力"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">安全注意事項</label>
                        <input
                          type="text"
                          value={step.safetyNotes}
                          onChange={(e) => handleStepChange(step.id, 'safetyNotes', e.target.value)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="安全上の注意点"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsModalOpen(false); setEditingTemplate(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingTemplate ? '更新' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTemplate;
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'workflow_templates';

export const useWorkflowTemplates = () => {
  const [templates, setTemplates] = useState([]);

  // ローカルストレージからテンプレートを読み込み
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem(STORAGE_KEY);
      if (savedTemplates) {
        setTemplates(JSON.parse(savedTemplates));
      } else {
        // 初期サンプルテンプレートを設定
        const sampleTemplates = [
          {
            id: 'template_casting_standard',
            name: 'ステンレス鋳造 標準工程',
            productCode: 'STANDARD',
            productName: '標準ステンレス製品',
            description: '一般的なステンレス鋳造製品の標準作業工程',
            steps: [
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
                checkPoints: ['温度確認 (1500℃)', '成分確認', '不純物除去'],
                tools: ['溶解炉', '温度計', '成分分析器'],
                safetyNotes: '高温注意、防護服着用必須'
              },
              {
                id: 3,
                name: '鋳造',
                description: '溶解金属を型に注入',
                estimatedTime: 45,
                checkPoints: ['注入速度確認', '温度管理', '気泡確認'],
                tools: ['鋳型', '注入器具', 'レードル'],
                safetyNotes: '高温金属注意、飛散防止'
              },
              {
                id: 4,
                name: '冷却・脱型',
                description: '冷却後の脱型作業',
                estimatedTime: 120,
                checkPoints: ['冷却時間確認', '収縮確認', '外観確認'],
                tools: ['脱型器具', '検査治具', 'クレーン'],
                safetyNotes: '重量物取扱注意、吊り作業注意'
              },
              {
                id: 5,
                name: '仕上げ加工',
                description: 'バリ取り、研磨、仕上げ',
                estimatedTime: 60,
                checkPoints: ['寸法確認', '表面粗さ', '外観品質'],
                tools: ['研磨機', '測定器', 'バリ取り工具', 'やすり'],
                safetyNotes: '回転機械注意、保護具着用、粉塵対策'
              },
              {
                id: 6,
                name: '最終検査',
                description: '寸法検査、外観検査、品質確認',
                estimatedTime: 30,
                checkPoints: ['寸法公差', '表面欠陥', '材質確認', '強度確認'],
                tools: ['測定器', '検査治具', '顕微鏡', '硬度計'],
                safetyNotes: '測定器取扱注意、精密作業'
              }
            ],
            totalEstimatedTime: 375,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        setTemplates(sampleTemplates);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTemplates));
      }
    } catch (error) {
      console.error('Error loading workflow templates:', error);
      setTemplates([]);
    }
  }, []);

  // ローカルストレージに保存
  const saveToStorage = (templatesData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templatesData));
    } catch (error) {
      console.error('Error saving workflow templates:', error);
    }
  };

  // テンプレート追加
  const addTemplate = (templateData) => {
    const newTemplate = {
      ...templateData,
      id: templateData.id || `template_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates);
    return newTemplate;
  };

  // テンプレート更新
  const updateTemplate = (updatedTemplate) => {
    const updatedTemplates = templates.map(template =>
      template.id === updatedTemplate.id
        ? { ...updatedTemplate, updatedAt: new Date().toISOString() }
        : template
    );
    setTemplates(updatedTemplates);
    saveToStorage(updatedTemplates);
  };

  // テンプレート削除
  const deleteTemplate = (templateId) => {
    if (window.confirm('このテンプレートを削除しますか？')) {
      const updatedTemplates = templates.filter(template => template.id !== templateId);
      setTemplates(updatedTemplates);
      saveToStorage(updatedTemplates);
    }
  };

  // ID でテンプレート取得
  const getTemplateById = (templateId) => {
    return templates.find(template => template.id === templateId);
  };

  // 製品コードでテンプレート取得
  const getTemplatesByProductCode = (productCode) => {
    return templates.filter(template => template.productCode === productCode);
  };

  // 全テンプレートをリセット（開発用）
  const resetTemplates = () => {
    setTemplates([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    getTemplatesByProductCode,
    resetTemplates,
    setTemplates
  };
};
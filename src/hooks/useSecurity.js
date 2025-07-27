// セキュリティ機能用のReact Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DataValidator, 
  InputSanitizer, 
  CSRFProtection, 
  SecureStorage,
  SecurityAuditor,
  securityHelpers
} from '../utils/security-utils';

// データ検証Hook
export const useDataValidation = (schema) => {
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback((data) => {
    const result = DataValidator.validate(data, schema);
    setErrors(result.errors);
    setIsValid(result.isValid);
    return result;
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  const getFieldError = useCallback((fieldName) => {
    return errors[fieldName] ? errors[fieldName][0] : null;
  }, [errors]);

  const hasFieldError = useCallback((fieldName) => {
    return Boolean(errors[fieldName] && errors[fieldName].length > 0);
  }, [errors]);

  return {
    validate,
    clearErrors,
    getFieldError,
    hasFieldError,
    errors,
    isValid
  };
};

// 注文データ検証Hook
export const useOrderValidation = () => {
  return useDataValidation(DataValidator.orderSchema);
};

// 顧客データ検証Hook
export const useCustomerValidation = () => {
  return useDataValidation(DataValidator.customerSchema);
};

// 製品データ検証Hook
export const useProductValidation = () => {
  return useDataValidation(DataValidator.productSchema);
};

// 入力サニタイゼーションHook
export const useSanitizedInput = (initialValue = '', sanitizer = InputSanitizer.sanitizeString) => {
  const [value, setValue] = useState(initialValue);
  const [rawValue, setRawValue] = useState(initialValue);

  const handleChange = useCallback((newValue) => {
    setRawValue(newValue);
    const sanitized = sanitizer(newValue);
    setValue(sanitized);
    
    // セキュリティ監査
    SecurityAuditor.auditInput(newValue, 'user_input');
    
    return sanitized;
  }, [sanitizer]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setRawValue(initialValue);
  }, [initialValue]);

  return {
    value,
    rawValue,
    handleChange,
    reset,
    isSanitized: value !== rawValue
  };
};

// CSRF保護Hook
export const useCSRFProtection = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const currentToken = CSRFProtection.getToken();
    setToken(currentToken);
  }, []);

  const refreshToken = useCallback(() => {
    const newToken = CSRFProtection.setToken();
    setToken(newToken);
    return newToken;
  }, []);

  const addTokenToRequest = useCallback((requestOptions) => {
    return CSRFProtection.addTokenToRequest(requestOptions);
  }, []);

  const addTokenToFormData = useCallback((formData) => {
    return CSRFProtection.addTokenToFormData(formData);
  }, []);

  const verifyToken = useCallback((receivedToken) => {
    return CSRFProtection.verifyToken(receivedToken);
  }, []);

  return {
    token,
    refreshToken,
    addTokenToRequest,
    addTokenToFormData,
    verifyToken
  };
};

// セキュアストレージHook
export const useSecureStorage = (key, defaultValue = null) => {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初期化時にデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const storedValue = await SecureStorage.getItem(key);
        setValue(storedValue !== null ? storedValue : defaultValue);
      } catch (err) {
        setError(err);
        setValue(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, defaultValue]);

  const setSecureValue = useCallback(async (newValue) => {
    try {
      setError(null);
      await SecureStorage.setItem(key, newValue);
      setValue(newValue);
    } catch (err) {
      setError(err);
      console.error('セキュアストレージ保存エラー:', err);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      SecureStorage.removeItem(key);
      setValue(defaultValue);
    } catch (err) {
      setError(err);
    }
  }, [key, defaultValue]);

  return {
    value,
    setValue: setSecureValue,
    removeValue,
    loading,
    error
  };
};

// セキュリティ監査Hook
export const useSecurityAudit = (options = {}) => {
  const { maxViolations = 50, autoReport = false } = options;
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // 定期的に違反履歴を更新
    const interval = setInterval(() => {
      const currentViolations = SecurityAuditor.getViolations();
      setViolations(currentViolations.slice(0, maxViolations));
      
      // 統計を計算
      const violationStats = currentViolations.reduce((acc, violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        return acc;
      }, {});
      setStats(violationStats);
    }, 5000); // 5秒間隔

    return () => clearInterval(interval);
  }, [maxViolations]);

  const reportViolation = useCallback((type, details) => {
    SecurityAuditor.recordViolation(type, details);
    
    if (autoReport) {
      // 自動レポート機能（実装は環境に依存）
      console.warn('セキュリティ違反を報告:', { type, details });
    }
  }, [autoReport]);

  const clearViolations = useCallback(() => {
    SecurityAuditor.clearViolations();
    setViolations([]);
    setStats({});
  }, []);

  const getViolationsByType = useCallback((type) => {
    return violations.filter(v => v.type === type);
  }, [violations]);

  return {
    violations,
    stats,
    reportViolation,
    clearViolations,
    getViolationsByType
  };
};

// レート制限Hook
export const useRateLimit = (key, maxRequests = 10, timeWindow = 60000) => {
  const [remainingRequests, setRemainingRequests] = useState(maxRequests);
  const [resetTime, setResetTime] = useState(null);
  const lastCheck = useRef(0);

  const checkLimit = useCallback(() => {
    const canProceed = securityHelpers.checkRateLimit(key, maxRequests, timeWindow);
    
    if (canProceed) {
      const now = Date.now();
      const requests = JSON.parse(sessionStorage.getItem(`rate_limit_${key}`) || '[]');
      const validRequests = requests.filter(timestamp => now - timestamp < timeWindow);
      
      setRemainingRequests(maxRequests - validRequests.length);
      
      if (validRequests.length > 0) {
        const oldestRequest = Math.min(...validRequests);
        setResetTime(new Date(oldestRequest + timeWindow));
      }
    } else {
      setRemainingRequests(0);
    }

    lastCheck.current = Date.now();
    return canProceed;
  }, [key, maxRequests, timeWindow]);

  // 定期的にレート制限状態を更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastCheck.current > 1000) { // 1秒以上経過した場合のみチェック
        checkLimit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [checkLimit]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(`rate_limit_${key}`);
    setRemainingRequests(maxRequests);
    setResetTime(null);
  }, [key, maxRequests]);

  return {
    checkLimit,
    remainingRequests,
    resetTime,
    reset,
    isLimited: remainingRequests <= 0
  };
};

// セキュアなフォームHook
export const useSecureForm = (initialData = {}, validationSchema = null) => {
  const [formData, setFormData] = useState(initialData);
  const [originalData, setOriginalData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { validate, errors, isValid, clearErrors } = useDataValidation(validationSchema || {});
  const { addTokenToFormData } = useCSRFProtection();

  const setValue = useCallback((field, value) => {
    // 入力のサニタイゼーション
    const sanitizedValue = typeof value === 'string' 
      ? InputSanitizer.sanitizeString(value) 
      : value;

    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));

    // セキュリティ監査
    SecurityAuditor.auditInput(String(value), `form_field_${field}`);
  }, []);

  const setValues = useCallback((values) => {
    const sanitizedValues = {};
    Object.keys(values).forEach(key => {
      sanitizedValues[key] = typeof values[key] === 'string'
        ? InputSanitizer.sanitizeString(values[key])
        : values[key];
    });

    setFormData(prev => ({
      ...prev,
      ...sanitizedValues
    }));
  }, []);

  const reset = useCallback(() => {
    setFormData(initialData);
    setOriginalData(initialData);
    clearErrors();
  }, [initialData, clearErrors]);

  const validateForm = useCallback(() => {
    if (validationSchema) {
      return validate(formData);
    }
    return { isValid: true, errors: {} };
  }, [formData, validate, validationSchema]);

  const submitForm = useCallback(async (submitHandler) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // フォーム検証
      const validationResult = validateForm();
      if (!validationResult.isValid) {
        return { success: false, errors: validationResult.errors };
      }

      // CSRFトークンを追加
      const secureFormData = addTokenToFormData({ ...formData });

      // 送信処理
      const result = await submitHandler(secureFormData, originalData);
      
      if (result.success) {
        setOriginalData(formData);
      }

      return result;
    } catch (error) {
      console.error('フォーム送信エラー:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, originalData, validateForm, addTokenToFormData, isSubmitting]);

  const isDirty = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  return {
    formData,
    setValue,
    setValues,
    reset,
    validateForm,
    submitForm,
    errors,
    isValid,
    isSubmitting,
    isDirty: isDirty()
  };
};

// 入力フィールド用のセキュリティHook
export const useSecureInput = (name, initialValue = '', options = {}) => {
  const { 
    sanitizer = InputSanitizer.sanitizeString,
    validator = null,
    maxLength = 1000,
    onViolation = null
  } = options;

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [isTouched, setIsTouched] = useState(false);

  const handleChange = useCallback((newValue) => {
    setIsTouched(true);
    
    // 長さ制限チェック
    if (newValue.length > maxLength) {
      const violation = {
        type: 'input_length_exceeded',
        field: name,
        length: newValue.length,
        maxLength
      };
      SecurityAuditor.recordViolation('input_validation', violation);
      if (onViolation) onViolation(violation);
      return;
    }

    // セキュリティ監査
    SecurityAuditor.auditInput(newValue, `input_${name}`);

    // サニタイゼーション
    const sanitized = sanitizer(newValue);
    setValue(sanitized);

    // バリデーション
    if (validator) {
      const isValid = validator(sanitized);
      setError(isValid ? '' : `${name}の値が無効です`);
    } else {
      setError('');
    }
  }, [name, sanitizer, validator, maxLength, onViolation]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError('');
    setIsTouched(false);
  }, [initialValue]);

  return {
    value,
    onChange: handleChange,
    error,
    isTouched,
    reset,
    hasError: Boolean(error)
  };
};
/**
 * 3단계: 접두어 처리 화면
 *
 * 반복 접두어가 감지된 경우 삭제 여부를 사용자에게 묻습니다.
 * 접두어가 없는 경우 자동으로 다음 단계로 진행합니다.
 */
import React, { useState, useEffect } from 'react';
import { confirmPrefixes } from '../api/client';

export default function PrefixDetector({ sessionId, prefixes, onDone }) {
  // 각 접두어의 삭제 여부: { [prefix]: boolean }
  const [deleteMap, setDeleteMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 접두어가 없으면 자동으로 다음 단계
  useEffect(() => {
    if (prefixes.length === 0) {
      handleSubmit([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDelete = (prefix) => {
    setDeleteMap((prev) => ({ ...prev, [prefix]: !prev[prefix] }));
  };

  const handleSubmit = async (overrideDeleteList) => {
    setLoading(true);
    setError('');

    const toDelete = overrideDeleteList !== undefined
      ? overrideDeleteList
      : prefixes.filter((p) => deleteMap[p]);

    try {
      const result = await confirmPrefixes(sessionId, toDelete);
      onDone(result.review_items, result.total_slides);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || '처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 접두어 없는 경우 로딩 화면
  if (prefixes.length === 0) {
    return (
      <div className="card">
        <p className="loading-text">텍스트를 정리하는 중...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">반복 접두어 감지</h2>
      <p className="card-desc">
        다음 접두어가 여러 슬라이드에서 반복 발견되었습니다. 삭제할 항목을 선택하세요.
      </p>

      <div className="prefix-list">
        {prefixes.map((prefix) => (
          <label key={prefix} className="prefix-item">
            <input
              type="checkbox"
              checked={!!deleteMap[prefix]}
              onChange={() => toggleDelete(prefix)}
            />
            <span className="prefix-text">{prefix}</span>
          </label>
        ))}
      </div>

      <div className="prefix-action-hint">
        <span>체크한 접두어는 모든 슬라이드 텍스트에서 제거됩니다.</span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="btn-group">
        <button
          className="btn btn-danger"
          onClick={() => handleSubmit(undefined)}
          disabled={loading || Object.values(deleteMap).every((v) => !v)}
        >
          {loading ? '처리 중...' : '삭제'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleSubmit([])}
          disabled={loading}
        >
          모두 유지
        </button>
      </div>
    </div>
  );
}

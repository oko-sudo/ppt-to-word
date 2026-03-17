/**
 * 4단계: 검수 화면
 *
 * 비한글 항목(영어, 숫자, 특수기호 등)을 목록으로 표시합니다.
 * 사용자는 각 항목에 대해:
 *   - 독음/대체어 입력
 *   - 삭제 체크
 * 를 설정하고 Word 문서를 생성합니다.
 */
import React, { useState } from 'react';
import { generateWord } from '../api/client';

export default function ReviewScreen({ sessionId, reviewItems, totalSlides, onDone }) {
  // 각 항목의 결정: { [text]: { user_input: string, delete: boolean } }
  const [decisions, setDecisions] = useState(() =>
    Object.fromEntries(
      reviewItems.map((item) => [item.text, { user_input: '', delete: false }])
    )
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateDecision = (text, field, value) => {
    setDecisions((prev) => ({
      ...prev,
      [text]: { ...prev[text], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    // 검수 결과 변환: decisions 객체 → 배열
    const reviewDecisions = reviewItems.map((item) => ({
      text: item.text,
      user_input: decisions[item.text]?.user_input?.trim() || '',
      delete: decisions[item.text]?.delete || false,
    }));

    try {
      const result = await generateWord(sessionId, reviewDecisions);
      onDone(result);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Word 생성 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const deleteCount = Object.values(decisions).filter((d) => d.delete).length;
  const inputCount = Object.values(decisions).filter((d) => d.user_input.trim()).length;

  return (
    <div className="card review-card">
      <h2 className="card-title">검토 필요 항목</h2>
      <p className="card-desc">
        슬라이드 텍스트에서 독음 또는 처리가 필요할 수 있는 항목입니다.
        <br />
        입력칸에 대체어를 입력하거나 삭제를 선택하세요.
        입력이 없으면 원문이 유지됩니다.
      </p>

      {/* 요약 뱃지 */}
      <div className="review-summary">
        <span>전체 항목: <strong>{reviewItems.length}</strong></span>
        <span>입력됨: <strong>{inputCount}</strong></span>
        <span>삭제 예정: <strong>{deleteCount}</strong></span>
      </div>

      {reviewItems.length === 0 ? (
        <div className="empty-state">검수 항목이 없습니다. Word 문서를 생성하시겠습니까?</div>
      ) : (
        <div className="review-list">
          {reviewItems.map((item) => {
            const dec = decisions[item.text] || { user_input: '', delete: false };
            return (
              <div
                key={item.text}
                className={`review-item-card ${dec.delete ? 'deleted' : ''}`}
              >
                {/* 원문 & 등장 횟수 */}
                <div className="review-item-header">
                  <span className="review-item-text">{item.text}</span>
                  <span className="review-item-count">등장 횟수: {item.occurrences}</span>
                </div>

                {/* Word 미리보기 */}
                <div className="review-item-preview">
                  Word 출력:{' '}
                  {dec.delete ? (
                    <span className="preview-deleted">[삭제됨]</span>
                  ) : dec.user_input.trim() ? (
                    <span className="preview-red">
                      {item.text}[{dec.user_input.trim()}]
                    </span>
                  ) : (
                    <span className="preview-red">{item.text}</span>
                  )}
                </div>

                {/* 입력 필드 & 삭제 체크 */}
                <div className="review-item-controls">
                  <input
                    type="text"
                    className="review-input"
                    placeholder="독음 또는 대체어 입력 (없으면 원문 유지)"
                    value={dec.user_input}
                    disabled={dec.delete}
                    onChange={(e) => updateDecision(item.text, 'user_input', e.target.value)}
                  />
                  <label className="delete-label">
                    <input
                      type="checkbox"
                      checked={dec.delete}
                      onChange={(e) => updateDecision(item.text, 'delete', e.target.checked)}
                    />
                    삭제
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="review-action">
        <button
          className="btn btn-primary btn-large"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Word 생성 중...' : 'Word 문서 생성'}
        </button>
        <p className="review-action-hint">
          슬라이드 {totalSlides}개 → Word 문서 생성
        </p>
      </div>
    </div>
  );
}

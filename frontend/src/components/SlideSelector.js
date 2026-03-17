/**
 * 2단계: 텍스트 상자 선택 화면
 *
 * 한 슬라이드에 #마커 후보가 여러 개일 경우 사용자가 하나를 선택합니다.
 * 선택이 필요 없는 경우(needsSelection=false)에는 자동으로 다음 단계로 넘어갑니다.
 */
import React, { useState, useEffect } from 'react';
import { selectTextboxes } from '../api/client';

export default function SlideSelector({ sessionId, slides, needsSelection, onDone }) {
  // 선택이 필요한 슬라이드만 추출
  const selectableSlides = slides.filter((s) => !s.auto_selected);

  // 각 슬라이드별 선택 상태: { [slide_number]: TextBoxCandidate }
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 선택이 필요 없는 경우 자동으로 API 호출
  useEffect(() => {
    if (!needsSelection) {
      submitSelections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSelection]);

  const handleSelect = (slideNumber, candidate) => {
    setSelections((prev) => ({ ...prev, [slideNumber]: candidate }));
  };

  const submitSelections = async (selectionList) => {
    setLoading(true);
    setError('');
    try {
      const result = await selectTextboxes(sessionId, selectionList);
      onDone(result.detected_prefixes);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || '선택 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    // 모든 선택이 완료되었는지 확인
    const unselected = selectableSlides.filter((s) => !selections[s.slide_number]);
    if (unselected.length > 0) {
      setError(`슬라이드 ${unselected.map((s) => s.slide_number).join(', ')}의 텍스트 상자를 선택해 주세요.`);
      return;
    }

    // 선택 결과 변환
    const selectionList = selectableSlides.map((s) => {
      const chosen = selections[s.slide_number];
      return {
        slide_number: s.slide_number,
        textbox_id: chosen.id,
        full_text: chosen.full_text,
      };
    });

    submitSelections(selectionList);
  };

  // 자동 진행 중인 경우 로딩 표시
  if (!needsSelection) {
    return (
      <div className="card">
        <p className="loading-text">슬라이드 텍스트를 분석하는 중...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">텍스트 상자 선택</h2>
      <p className="card-desc">
        아래 슬라이드에서 여러 개의 텍스트 상자가 발견되었습니다. 각 슬라이드에서 하나를 선택해 주세요.
      </p>

      {selectableSlides.map((slide) => (
        <div key={slide.slide_number} className="slide-selector-group">
          <h3 className="slide-number-title">슬라이드 {slide.slide_number}</h3>
          <p className="slide-selector-hint">다음 텍스트 상자가 발견되었습니다.</p>

          <div className="candidate-list">
            {slide.candidates.map((candidate) => {
              const isSelected = selections[slide.slide_number]?.id === candidate.id;
              return (
                <label
                  key={candidate.id}
                  className={`candidate-item ${isSelected ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`slide-${slide.slide_number}`}
                    checked={isSelected}
                    onChange={() => handleSelect(slide.slide_number, candidate)}
                  />
                  <span className="candidate-marker">{candidate.marker}</span>
                  <span className="candidate-preview">{candidate.preview}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && <div className="error-box">{error}</div>}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '처리 중...' : '다음 단계'}
      </button>
    </div>
  );
}

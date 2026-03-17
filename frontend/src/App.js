/**
 * 메인 앱 컴포넌트
 * 상태(step)에 따라 화면 전환을 관리합니다.
 *
 * 단계:
 *   upload       → 파일 업로드 화면
 *   select       → 텍스트 상자 선택 화면 (필요한 경우)
 *   prefix       → 접두어 확인 화면
 *   review       → 검수 화면
 *   result       → 결과/다운로드 화면
 */
import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import SlideSelector from './components/SlideSelector';
import PrefixDetector from './components/PrefixDetector';
import ReviewScreen from './components/ReviewScreen';
import ResultScreen from './components/ResultScreen';

export default function App() {
  // 현재 단계
  const [step, setStep] = useState('upload');

  // 공유 상태
  const [sessionId, setSessionId] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);  // UploadResponse
  const [prefixes, setPrefixes] = useState([]);            // 감지된 접두어
  const [reviewItems, setReviewItems] = useState([]);      // 검수 항목
  const [totalSlides, setTotalSlides] = useState(0);
  const [downloadInfo, setDownloadInfo] = useState(null);  // {token, filename}

  // ── 단계 전환 핸들러 ──────────────────────────────────────────────────────

  /** 1단계 완료: 업로드 결과 수신 */
  const handleUploadDone = (result) => {
    setUploadResult(result);
    setSessionId(result.session_id);
    setTotalSlides(result.total_slides);

    if (result.needs_selection) {
      setStep('select');
    } else {
      // 선택 불필요 → /select API를 빈 selections로 자동 호출은 SlideSelector가 처리
      // 여기서는 직접 prefix 단계로 넘어가도 되지만,
      // 접두어 감지를 위해 select API 호출이 필요하므로 select 단계를 경유
      setStep('select');
    }
  };

  /** 2단계 완료: 텍스트 상자 선택 완료, 접두어 수신 */
  const handleSelectDone = (detectedPrefixes) => {
    setPrefixes(detectedPrefixes);
    setStep('prefix');
  };

  /** 3단계 완료: 접두어 처리 완료, 검수 항목 수신 */
  const handlePrefixDone = (items, slides) => {
    setReviewItems(items);
    setTotalSlides(slides);
    setStep('review');
  };

  /** 4단계 완료: Word 생성 완료 */
  const handleReviewDone = (info) => {
    setDownloadInfo(info);
    setStep('result');
  };

  /** 처음부터 다시 시작 */
  const handleReset = () => {
    setStep('upload');
    setSessionId(null);
    setUploadResult(null);
    setPrefixes([]);
    setReviewItems([]);
    setDownloadInfo(null);
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>PPT → Word 변환기</h1>
        <p className="app-subtitle">PowerPoint 슬라이드 텍스트를 Word 문서로 변환합니다</p>
      </header>

      <main className="app-main">
        {/* 진행 단계 표시 */}
        <StepIndicator current={step} />

        {step === 'upload' && (
          <UploadForm onDone={handleUploadDone} />
        )}

        {step === 'select' && uploadResult && (
          <SlideSelector
            sessionId={sessionId}
            slides={uploadResult.slides}
            needsSelection={uploadResult.needs_selection}
            onDone={handleSelectDone}
          />
        )}

        {step === 'prefix' && (
          <PrefixDetector
            sessionId={sessionId}
            prefixes={prefixes}
            onDone={handlePrefixDone}
          />
        )}

        {step === 'review' && (
          <ReviewScreen
            sessionId={sessionId}
            reviewItems={reviewItems}
            totalSlides={totalSlides}
            onDone={handleReviewDone}
          />
        )}

        {step === 'result' && downloadInfo && (
          <ResultScreen
            downloadInfo={downloadInfo}
            totalSlides={totalSlides}
            reviewCount={reviewItems.length}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

/** 상단 진행 단계 표시 컴포넌트 */
function StepIndicator({ current }) {
  const steps = [
    { key: 'upload', label: '업로드' },
    { key: 'select', label: '텍스트 선택' },
    { key: 'prefix', label: '접두어 처리' },
    { key: 'review', label: '검수' },
    { key: 'result', label: '완료' },
  ];

  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="step-indicator">
      {steps.map((s, idx) => (
        <React.Fragment key={s.key}>
          <div
            className={`step-dot ${idx < currentIdx ? 'done' : ''} ${idx === currentIdx ? 'active' : ''}`}
            title={s.label}
          >
            <span className="step-label">{s.label}</span>
          </div>
          {idx < steps.length - 1 && <div className={`step-line ${idx < currentIdx ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

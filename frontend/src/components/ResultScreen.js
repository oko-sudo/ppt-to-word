/**
 * 5단계: 결과/다운로드 화면
 *
 * Word 문서 생성 완료 후 다운로드 버튼을 표시합니다.
 */
import React, { useState } from 'react';
import { downloadWord } from '../api/client';

export default function ResultScreen({ downloadInfo, totalSlides, reviewCount, onReset }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadWord(downloadInfo.download_token, downloadInfo.filename);
    } catch (err) {
      setError('다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card result-card">
      <div className="result-icon">✅</div>
      <h2 className="card-title">분석 완료</h2>

      <div className="result-stats">
        <div className="stat-item">
          <span className="stat-label">처리된 슬라이드</span>
          <span className="stat-value">{totalSlides}개</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">검토 항목</span>
          <span className="stat-value">{reviewCount}개</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">출력 파일</span>
          <span className="stat-value filename">{downloadInfo.filename}</span>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="result-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? '다운로드 중...' : '📥 Word 다운로드'}
        </button>

        <button className="btn btn-secondary" onClick={onReset}>
          처음부터 다시
        </button>
      </div>
    </div>
  );
}

/**
 * 1단계: 업로드 화면
 * - 슬라이드 접두어 입력
 * - PPT 파일 업로드
 * - 텍스트 추출 위치 선택 (텍스트 상자 / 메모)
 */
import React, { useState, useRef } from 'react';
import { uploadPptx } from '../api/client';

export default function UploadForm({ onDone }) {
  const [prefix, setPrefix] = useState('');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState({ textbox: true, notes: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // 추출 위치 체크박스 변경
  const handleLocationChange = (key) => {
    setLocation((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 선택된 추출 위치 문자열 변환
  const getExtractionLocation = () => {
    if (location.textbox && location.notes) return 'textbox'; // 둘 다 선택 시 textbox 우선
    if (location.textbox) return 'textbox';
    if (location.notes) return 'notes';
    return null;
  };

  // 파일 선택
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith('.pptx')) {
      setError('.pptx 파일만 업로드할 수 있습니다.');
      setFile(null);
      return;
    }
    setFile(selected || null);
    setError('');
  };

  // 드래그앤드롭
  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.toLowerCase().endsWith('.pptx')) {
      setFile(dropped);
      setError('');
    } else {
      setError('.pptx 파일만 업로드할 수 있습니다.');
    }
  };

  // 분석 시작
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!prefix.trim()) {
      setError('슬라이드 접두어를 입력해 주세요.');
      return;
    }
    if (!file) {
      setError('PPT 파일을 선택해 주세요.');
      return;
    }
    const extractionLocation = getExtractionLocation();
    if (!extractionLocation) {
      setError('텍스트 추출 위치를 하나 이상 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await uploadPptx(file, prefix.trim(), extractionLocation);
      onDone(result);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || '업로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">파일 업로드</h2>

      <form onSubmit={handleSubmit} className="upload-form">

        {/* ── 슬라이드 접두어 ── */}
        <div className="form-group">
          <label className="form-label" htmlFor="prefix">
            슬라이드 접두어
          </label>
          <input
            id="prefix"
            type="text"
            className="form-input"
            placeholder="예: 04차시"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <p className="form-hint">
            예: <strong>04차시</strong> 입력 시 슬라이드 번호는{' '}
            <code>04차시_01</code>, <code>04차시_02</code> 형식으로 생성됩니다.
          </p>
        </div>

        {/* ── PPT 파일 업로드 ── */}
        <div className="form-group">
          <label className="form-label">PPT 파일</label>
          <div
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <span className="drop-zone-filename">📄 {file.name}</span>
            ) : (
              <span className="drop-zone-hint">
                파일을 여기에 끌어다 놓거나 클릭하여 선택하세요<br />
                <small>(.pptx 파일만 지원)</small>
              </span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pptx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* ── 텍스트 추출 위치 ── */}
        <div className="form-group">
          <label className="form-label">텍스트 추출 위치</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={location.textbox}
                onChange={() => handleLocationChange('textbox')}
              />
              슬라이드 텍스트 상자 <span className="badge">#마커 포함 텍스트</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={location.notes}
                onChange={() => handleLocationChange('notes')}
              />
              슬라이드 메모
            </label>
          </div>
          {location.textbox && location.notes && (
            <p className="form-hint warning">
              ⚠️ 두 옵션을 모두 선택하면 <strong>텍스트 상자</strong> 모드로 처리됩니다.
            </p>
          )}
        </div>

        {/* ── 에러 메시지 ── */}
        {error && <div className="error-box">{error}</div>}

        {/* ── 제출 버튼 ── */}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '분석 중...' : '분석 시작'}
        </button>
      </form>
    </div>
  );
}

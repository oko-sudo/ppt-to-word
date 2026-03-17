/**
 * API 클라이언트
 * 백엔드 FastAPI와 통신하는 모든 함수를 여기에 정의합니다.
 *
 * 개발 환경: package.json의 proxy 설정으로 localhost:8000 으로 자동 연결
 * 배포 환경: .env 파일에 REACT_APP_API_URL=https://your-backend.onrender.com 설정
 */
import axios from 'axios';

const BASE_URL = (process.env.REACT_APP_API_URL || '') + '/api';

/**
 * 1단계: PPT 파일 업로드 및 슬라이드 분석
 * @param {File} file - .pptx 파일
 * @param {string} prefix - 슬라이드 접두어 (예: "04차시")
 * @param {string} extractionLocation - "textbox" 또는 "notes"
 * @returns {Promise<UploadResponse>}
 */
export async function uploadPptx(file, prefix, extractionLocation) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prefix', prefix);
  formData.append('extraction_location', extractionLocation);

  const { data } = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * 2단계: 텍스트 상자 선택 결과 전송
 * @param {string} sessionId - 세션 ID
 * @param {Array<{slide_number, textbox_id, full_text}>} selections - 선택 결과
 * @returns {Promise<SelectResponse>}
 */
export async function selectTextboxes(sessionId, selections) {
  const { data } = await axios.post(`${BASE_URL}/select`, {
    session_id: sessionId,
    selections,
  });
  return data;
}

/**
 * 3단계: 접두어 삭제 확인 및 검수 항목 수신
 * @param {string} sessionId - 세션 ID
 * @param {string[]} deletePrefixes - 삭제할 접두어 목록
 * @returns {Promise<ConfirmPrefixResponse>}
 */
export async function confirmPrefixes(sessionId, deletePrefixes) {
  const { data } = await axios.post(`${BASE_URL}/confirm-prefixes`, {
    session_id: sessionId,
    delete_prefixes: deletePrefixes,
  });
  return data;
}

/**
 * 4단계: Word 문서 생성
 * @param {string} sessionId - 세션 ID
 * @param {Array<{text, user_input, delete}>} reviewDecisions - 검수 결과
 * @returns {Promise<GenerateResponse>}
 */
export async function generateWord(sessionId, reviewDecisions) {
  const { data } = await axios.post(`${BASE_URL}/generate`, {
    session_id: sessionId,
    review_decisions: reviewDecisions,
  });
  return data;
}

/**
 * 5단계: 생성된 Word 파일 다운로드
 * @param {string} token - 다운로드 토큰
 * @param {string} filename - 저장 파일명
 */
export async function downloadWord(token, filename) {
  const response = await axios.get(`${BASE_URL}/download/${token}`, {
    responseType: 'blob',
  });

  // Blob URL 생성 후 자동 다운로드
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

# PPT → Word 변환기

PowerPoint(.pptx)를 업로드하면 슬라이드 텍스트를 분석하여 Word(.docx) 문서를 생성하는 웹 애플리케이션입니다.

## 폴더 구조

```
ppt-to-word/
├── backend/
│   ├── main.py                  # FastAPI 앱 진입점
│   ├── requirements.txt
│   ├── config/
│   │   ├── settings.py          # 환경 설정 (수정 가능)
│   │   └── patterns.json        # 패턴/규칙 설정 (수정 가능) ★
│   ├── models/
│   │   └── schemas.py           # API 데이터 모델
│   ├── services/
│   │   ├── ppt_service.py       # PPT 텍스트 추출
│   │   ├── text_service.py      # 텍스트 분석/정리
│   │   └── word_service.py      # Word 문서 생성
│   ├── routers/
│   │   └── upload.py            # API 라우터
│   └── storage/
│       └── session_store.py     # 세션 상태 관리
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js               # 화면 전환 관리
│       ├── App.css
│       ├── api/client.js        # API 클라이언트
│       └── components/
│           ├── UploadForm.js    # 1단계: 업로드
│           ├── SlideSelector.js # 2단계: 텍스트 상자 선택
│           ├── PrefixDetector.js # 3단계: 접두어 처리
│           ├── ReviewScreen.js  # 4단계: 검수
│           └── ResultScreen.js  # 5단계: 다운로드
├── create_sample_pptx.py        # 테스트용 샘플 PPT 생성
└── README.md
```

## 실행 방법

### 사전 요구사항
- Python 3.11+
- Node.js 18+

---

### 1. 백엔드 실행

```bash
cd ppt-to-word/backend

# 가상환경 생성 (권장)
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 서버 시작
python main.py
```

백엔드: http://localhost:8000
API 문서: http://localhost:8000/docs

---

### 2. 프론트엔드 실행

```bash
cd ppt-to-word/frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm start
```

프론트엔드: http://localhost:3000

---

### 3. 샘플 PPT 생성

```bash
cd ppt-to-word
pip install python-pptx  # 백엔드 venv 활성화 후

python create_sample_pptx.py
# → sample_04차시.pptx 생성
```

생성된 파일을 웹사이트에 업로드하여 테스트합니다.

---

## 설정 변경

### patterns.json - 주요 수정 항목

| 항목 | 설명 | 기본값 |
|------|------|--------|
| `slide_marker.pattern` | 텍스트 상자 후보 마커 패턴 | `#(\d+)(-\d+)?` |
| `prefix_detection.min_occurrences` | 접두어로 간주할 최소 등장 횟수 | `2` |
| `word_output.slide_number_format` | 슬라이드 번호 형식 | `{prefix}_{number:02d}` |
| `word_output.review_item_color` | 검수 항목 색상 (HEX) | `FF0000` |
| `word_output.table_col1_width_cm` | 슬라이드 번호 열 너비 | `3.5` |

### settings.py - 환경 설정

| 항목 | 설명 | 기본값 |
|------|------|--------|
| `MAX_FILE_SIZE_MB` | 최대 파일 크기 | `50` |
| `SESSION_EXPIRE_MINUTES` | 세션 만료 시간 | `60` |

---

## API 흐름

```
POST /api/upload          → 파일 업로드 및 슬라이드 분석
POST /api/select          → 텍스트 상자 선택 (필요시)
POST /api/confirm-prefixes → 접두어 삭제 확인 + 검수 항목 추출
POST /api/generate        → Word 생성 + 다운로드 토큰 발급
GET  /api/download/{token} → .docx 파일 다운로드
```

## Word 출력 규칙

| 상황 | 출력 형식 | 서식 |
|------|-----------|------|
| 원문 유지 | `AI` | 빨간색 Bold |
| 독음 입력 | `AI[에이아이]` | 빨간색 Bold |
| 삭제 | (표시 안 함) | - |
| 한글 | `오늘은 ...` | 기본 |

# 배포 가이드

이 프로젝트는 **백엔드(Render) + 프론트엔드(Vercel)** 조합으로 무료 배포 가능합니다.

---

## 전체 구조

```
인터넷 사용자
    ↓ 접속
Vercel (프론트엔드) → https://your-app.vercel.app
    ↓ API 요청
Render (백엔드 API) → https://your-api.onrender.com
```

---

## 사전 준비 (1회만)

1. [GitHub](https://github.com) 계정 만들기
2. [Render](https://render.com) 계정 만들기 (GitHub로 가입 가능)
3. [Vercel](https://vercel.com) 계정 만들기 (GitHub로 가입 가능)
4. 이 프로젝트를 GitHub에 올리기:
   ```bash
   # 프로젝트 최상위 폴더에서 실행
   git init
   git add .
   git commit -m "initial commit"
   # GitHub에서 새 repository 만든 후:
   git remote add origin https://github.com/본인계정/ppt-to-word.git
   git push -u origin main
   ```

---

## 1단계: 백엔드 배포 (Render)

### 1-1. Render 대시보드에서 새 Web Service 생성

1. https://render.com 로그인
2. 오른쪽 상단 **"New +"** → **"Web Service"** 클릭
3. **"Connect a repository"** → GitHub 연결 → `ppt-to-word` 저장소 선택

### 1-2. 배포 설정 입력

| 항목 | 값 |
|------|-----|
| Name | `ppt-to-word-api` (원하는 이름) |
| Region | Singapore (Asia에 가장 가까움) |
| Branch | `main` |
| Root Directory | `backend` ← **반드시 입력** |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | **Free** 선택 |

### 1-3. 환경변수 설정

배포 설정 화면 하단 **"Advanced"** → **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | 일단 `http://localhost:3000` 으로 설정 (프론트 배포 후 수정) |

**"Create Web Service"** 클릭 → 약 3~5분 빌드 대기

### 1-4. 백엔드 URL 확인

배포 완료 후 화면 상단에 URL이 표시됩니다:
```
https://ppt-to-word-api.onrender.com   ← 이 주소를 복사해두세요
```

브라우저에서 `https://ppt-to-word-api.onrender.com/health` 접속 시
`{"status":"healthy"}` 가 뜨면 성공입니다.

---

## 2단계: 프론트엔드 배포 (Vercel)

### 2-1. Vercel 대시보드에서 프로젝트 추가

1. https://vercel.com 로그인
2. **"Add New Project"** 클릭
3. GitHub에서 `ppt-to-word` 저장소 선택 → **Import**

### 2-2. 배포 설정 입력

| 항목 | 값 |
|------|-----|
| Root Directory | `frontend` ← **반드시 입력 (Edit 버튼 클릭)** |
| Framework Preset | `Create React App` |
| Build Command | `npm run build` (자동 감지됨) |
| Output Directory | `build` (자동 감지됨) |

### 2-3. 환경변수 설정

**"Environment Variables"** 섹션에서:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://ppt-to-word-api.onrender.com` (1단계에서 복사한 주소) |

**"Deploy"** 클릭 → 약 1~2분 빌드 대기

### 2-4. 프론트엔드 URL 확인

배포 완료 후:
```
https://ppt-to-word-abc123.vercel.app   ← 이 주소를 복사해두세요
```

---

## 3단계: CORS 설정 업데이트 (백엔드)

백엔드가 프론트엔드 도메인을 허용하도록 설정 수정이 필요합니다.

1. Render 대시보드 → `ppt-to-word-api` 선택
2. **"Environment"** 탭 클릭
3. `CORS_ORIGINS` 값을 수정:
   ```
   https://ppt-to-word-abc123.vercel.app
   ```
   (Vercel에서 받은 실제 URL로 교체)
4. **"Save Changes"** → 자동 재배포 (1~2분)

---

## 4단계: 배포 후 테스트

브라우저에서 Vercel URL 접속 후 다음을 순서대로 테스트합니다:

1. **업로드 화면 로딩** - 흰 화면이 아닌 업로드 폼이 보이면 OK
2. **샘플 파일 업로드** - `create_sample_pptx.py` 실행 후 생성된 `sample_04차시.pptx` 업로드
3. **전체 흐름 진행** - 업로드 → 선택 → 접두어 → 검수 → 다운로드
4. **Word 파일 확인** - 다운로드된 .docx 파일이 정상 형식인지 확인

---

## 자주 묻는 문제

### Q: Render에서 배포 후 API 응답이 느려요 (첫 요청에 30초 이상)
A: Render 무료 플랜은 15분 사용이 없으면 서버가 절전 모드로 전환됩니다.
첫 요청 시 깨어나는 데 30~60초 걸립니다. 이는 정상입니다.
업로드 화면에서 "잠시 기다려주세요" 안내 문구가 표시되는 이유입니다.

### Q: CORS 오류가 납니다
A: Render의 `CORS_ORIGINS` 환경변수에 Vercel URL이 정확히 입력되었는지 확인하세요.
끝에 슬래시(`/`)가 있으면 안 됩니다. 예: `https://foo.vercel.app` (O) / `https://foo.vercel.app/` (X)

### Q: 파일 업로드가 안 됩니다 (413 오류)
A: Render 무료 플랜은 요청 크기 제한이 있을 수 있습니다.
`MAX_FILE_SIZE_MB` 환경변수를 `10` 으로 줄여보세요.

### Q: 세션이 자꾸 끊깁니다
A: Render 무료 플랜은 서버가 재시작될 수 있고, 재시작 시 인메모리 세션이 초기화됩니다.
작업 중 오래 멈추지 말고 연속해서 완료하세요.

---

## 커스텀 도메인 연결 (선택사항)

### Vercel 커스텀 도메인
1. Vercel 대시보드 → 프로젝트 → **"Settings"** → **"Domains"**
2. 구입한 도메인 입력 → DNS 설정 안내 따르기

### 백엔드 CORS 업데이트
커스텀 도메인 연결 후 Render의 `CORS_ORIGINS`에 커스텀 도메인도 추가:
```
https://foo.vercel.app,https://www.my-custom-domain.com
```

---

## 로컬 개발 계속하기

배포 설정 후에도 로컬 개발은 동일하게 사용 가능합니다:

```bash
# 백엔드
cd backend
pip install -r requirements.txt
python main.py

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm start
```

`frontend/.env.development` 파일에 `REACT_APP_API_URL=` 이 비어있으면
자동으로 `package.json`의 proxy 설정(`http://localhost:8000`)을 사용합니다.

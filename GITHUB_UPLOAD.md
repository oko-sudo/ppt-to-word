# GitHub 업로드 방법 (3단계)

---

## 1단계: GitHub에서 새 저장소(Repository) 만들기

1. https://github.com 로그인
2. 오른쪽 상단 **"+"** 버튼 → **"New repository"** 클릭
3. **Repository name**: `ppt-to-word`
4. **Public** 또는 **Private** 선택 (어느 것이든 무방)
5. ⚠️ **"Add a README file" 체크하지 말 것** (비워두기)
6. **"Create repository"** 클릭
7. 생성 후 화면에 보이는 주소 복사 (예: `https://github.com/본인아이디/ppt-to-word.git`)

---

## 2단계: 터미널에서 업로드 명령어 실행

> Windows: **시작 메뉴** → `cmd` 또는 `PowerShell` 검색해서 열기

아래 명령어를 **한 줄씩** 복사해서 실행하세요:

```bash
cd "C:\Users\RGB USER\ppt-to-word"
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/본인아이디/ppt-to-word.git
git push -u origin main
```

> ⚠️ 마지막에서 두 번째 줄의 `본인아이디` 부분을 실제 GitHub 아이디로 바꾸세요.

---

## 3단계: Render + Vercel에서 배포

**DEPLOY.md** 파일을 열어서 순서대로 따라하세요.

짧게 요약:
- **Render** → GitHub 저장소 연결 → Root Directory: `backend` → 배포
- **Vercel** → GitHub 저장소 연결 → Root Directory: `frontend` → 환경변수 설정 → 배포

자세한 설명은 `DEPLOY.md` 참조.

---

## 이후 코드 수정 시 GitHub 업데이트 방법

```bash
cd "C:\Users\RGB USER\ppt-to-word"
git add .
git commit -m "수정 내용 설명"
git push
```

push하면 Render와 Vercel이 자동으로 재배포됩니다.

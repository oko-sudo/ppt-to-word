"""
PPT → Word 변환기 - FastAPI 메인 애플리케이션
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from routers.upload import router as upload_router

# ── 앱 생성 ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PPT to Word Converter",
    description="PowerPoint 파일에서 텍스트를 추출하여 Word 문서를 생성합니다.",
    version="1.0.0",
)

# ── CORS 설정 ────────────────────────────────────────────────────────────────
# 환경변수 CORS_ORIGINS 에 콤마로 구분된 허용 도메인을 지정하세요.
# 예) CORS_ORIGINS=https://your-app.vercel.app
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 등록 ─────────────────────────────────────────────────────────────
app.include_router(upload_router, prefix="/api", tags=["변환"])


@app.get("/", tags=["헬스체크"])
async def root():
    return {"status": "ok", "message": "PPT to Word Converter API"}


@app.get("/health", tags=["헬스체크"])
async def health():
    return {"status": "healthy"}


# ── 직접 실행 시 uvicorn 시작 ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=port,
        reload=False,  # 프로덕션에서는 reload 비활성화
    )

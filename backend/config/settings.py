"""
설정 파일 - 환경변수 또는 .env 파일로 재정의 가능

배포 시 환경변수 설정 예시 (Render 대시보드):
  CORS_ORIGINS=https://your-app.vercel.app
"""
import json
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 서버 설정
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS 설정 - 콤마(,)로 구분하여 여러 도메인 허용
    # 예: CORS_ORIGINS=https://foo.vercel.app,https://bar.com
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS_ORIGINS 문자열을 리스트로 변환"""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # 세션 설정
    SESSION_EXPIRE_MINUTES: int = 60

    # 파일 설정
    MAX_FILE_SIZE_MB: int = 50
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "outputs"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# patterns.json 로드 (별도 설정 파일로 분리)
_patterns_path = os.path.join(os.path.dirname(__file__), "patterns.json")
with open(_patterns_path, "r", encoding="utf-8") as _f:
    PATTERNS = json.load(_f)


def get_settings() -> Settings:
    return settings

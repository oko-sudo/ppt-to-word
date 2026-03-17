"""
세션 상태 관리 - 업로드부터 Word 생성까지의 중간 상태를 저장

실제 운영 환경에서는 Redis 또는 DB로 교체하는 것을 권장합니다.
"""
import uuid
import time
from dataclasses import dataclass, field
from typing import Optional

from config.settings import settings


@dataclass
class SlideData:
    """슬라이드별 처리 데이터"""
    slide_number: int
    raw_text: str           # 원본 추출 텍스트
    cleaned_text: str = ""  # 정리된 텍스트 (접두어 제거, 마커 제거 후)


@dataclass
class SessionData:
    """세션 전체 데이터"""
    session_id: str
    ppt_filename: str
    prefix: str                          # 사용자가 입력한 슬라이드 접두어 (예: "04차시")
    extraction_location: str             # "textbox" 또는 "notes"
    created_at: float = field(default_factory=time.time)

    # PPT에서 추출한 슬라이드 데이터 (선택 완료 후 채워짐)
    slides: list[SlideData] = field(default_factory=list)

    # 생성된 Word 파일 경로 (generate 이후)
    output_path: Optional[str] = None


# 메모리 내 세션 저장소 (key: session_id)
_store: dict[str, SessionData] = {}


def create_session(
    ppt_filename: str,
    prefix: str,
    extraction_location: str,
) -> SessionData:
    """새 세션 생성"""
    session_id = str(uuid.uuid4())
    session = SessionData(
        session_id=session_id,
        ppt_filename=ppt_filename,
        prefix=prefix,
        extraction_location=extraction_location,
    )
    _store[session_id] = session
    _cleanup_expired()
    return session


def get_session(session_id: str) -> Optional[SessionData]:
    """세션 조회. 만료되었거나 없으면 None 반환"""
    session = _store.get(session_id)
    if session is None:
        return None
    # 만료 확인
    expire_seconds = settings.SESSION_EXPIRE_MINUTES * 60
    if time.time() - session.created_at > expire_seconds:
        del _store[session_id]
        return None
    return session


def save_session(session: SessionData) -> None:
    """세션 저장 (업데이트)"""
    _store[session.session_id] = session


def delete_session(session_id: str) -> None:
    """세션 삭제"""
    _store.pop(session_id, None)


def _cleanup_expired() -> None:
    """만료된 세션 정리 (세션 생성 시마다 호출)"""
    expire_seconds = settings.SESSION_EXPIRE_MINUTES * 60
    now = time.time()
    expired = [
        sid for sid, s in _store.items()
        if now - s.created_at > expire_seconds
    ]
    for sid in expired:
        del _store[sid]

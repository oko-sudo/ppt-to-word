"""
API 요청/응답에 사용되는 Pydantic 데이터 모델
"""
from typing import Optional
from pydantic import BaseModel


# ─────────────────────────────────────────
# 텍스트 상자 후보 (슬라이드에서 발견된 #마커 포함 텍스트)
# ─────────────────────────────────────────
class TextBoxCandidate(BaseModel):
    id: int                  # 슬라이드 내 텍스트 상자 인덱스
    marker: str              # 발견된 마커 (예: "#1", "#3-1")
    preview: str             # 미리보기 (첫 80자)
    full_text: str           # 전체 텍스트


class SlideInfo(BaseModel):
    slide_number: int
    candidates: list[TextBoxCandidate]  # 여러 개일 경우 사용자 선택 필요
    auto_selected: bool                 # True면 자동 선택됨 (후보 1개)
    selected_text: Optional[str] = None # auto_selected=True 일 때 선택된 텍스트


# ─────────────────────────────────────────
# 업로드 응답
# ─────────────────────────────────────────
class UploadResponse(BaseModel):
    session_id: str
    filename: str
    total_slides: int
    slides: list[SlideInfo]
    needs_selection: bool  # True면 사용자가 텍스트 상자를 선택해야 함


# ─────────────────────────────────────────
# 텍스트 상자 선택 요청
# ─────────────────────────────────────────
class SelectionItem(BaseModel):
    slide_number: int
    textbox_id: int       # TextBoxCandidate.id
    full_text: str        # 선택한 텍스트 상자의 전체 텍스트


class SelectRequest(BaseModel):
    session_id: str
    selections: list[SelectionItem]


class SelectResponse(BaseModel):
    session_id: str
    detected_prefixes: list[str]


# ─────────────────────────────────────────
# 접두어 확인 요청
# ─────────────────────────────────────────
class ConfirmPrefixRequest(BaseModel):
    session_id: str
    delete_prefixes: list[str]


class ReviewItem(BaseModel):
    text: str
    occurrences: int


class ConfirmPrefixResponse(BaseModel):
    session_id: str
    total_slides: int
    review_items: list[ReviewItem]


# ─────────────────────────────────────────
# Word 생성 요청
# ─────────────────────────────────────────
class ReviewDecision(BaseModel):
    text: str
    user_input: Optional[str] = None
    delete: bool = False


class GenerateRequest(BaseModel):
    session_id: str
    review_decisions: list[ReviewDecision]


class GenerateResponse(BaseModel):
    download_token: str
    filename: str

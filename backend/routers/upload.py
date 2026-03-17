"""
API 라우터 - PPT 업로드부터 Word 생성까지의 모든 엔드포인트

흐름:
  POST /upload          → 파일 업로드 및 슬라이드 분석
  POST /select          → 텍스트 상자 선택 (멀티 후보 슬라이드가 있을 때)
  POST /confirm-prefixes → 접두어 삭제 확인
  POST /generate        → Word 문서 생성
  GET  /download/{token} → 생성된 Word 파일 다운로드
"""
import os
import uuid
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import Response

from config.settings import settings
from models.schemas import (
    UploadResponse, SlideInfo,
    SelectRequest, SelectResponse,
    ConfirmPrefixRequest, ReviewItem, ConfirmPrefixResponse,
    GenerateRequest, GenerateResponse,
)
from services.ppt_service import extract_slides
from services.text_service import (
    detect_prefixes, clean_text, extract_review_items,
)
from services.word_service import generate_word
from storage.session_store import (
    SessionData, SlideData,
    create_session, get_session, save_session,
)

router = APIRouter()

# 생성된 Word 파일 임시 저장소 (download_token → bytes)
_generated_files: dict[str, tuple[str, bytes]] = {}  # token → (filename, bytes)


# ─────────────────────────────────────────────────────────────────────────────
# 1단계: PPT 업로드 및 분석
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_pptx(
    file: UploadFile = File(..., description=".pptx 파일"),
    prefix: str = Form(..., description="슬라이드 접두어 (예: 04차시)"),
    extraction_location: str = Form(
        ..., description="텍스트 추출 위치: 'textbox' 또는 'notes'"
    ),
):
    """
    PPT 파일을 업로드하고 슬라이드 텍스트를 분석합니다.

    - extraction_location='textbox': #마커가 포함된 텍스트 상자 추출
    - extraction_location='notes': 슬라이드 메모 추출
    """
    # 파일 확장자 검사
    if not file.filename.lower().endswith(".pptx"):
        raise HTTPException(status_code=400, detail="pptx 파일만 지원합니다.")

    # 파일 크기 검사
    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"파일 크기가 {settings.MAX_FILE_SIZE_MB}MB를 초과합니다."
        )

    # 입력값 검사
    if extraction_location not in ("textbox", "notes"):
        raise HTTPException(
            status_code=400,
            detail="extraction_location은 'textbox' 또는 'notes' 이어야 합니다."
        )

    # 임시 파일로 저장 후 처리
    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        slides_info: list[SlideInfo] = extract_slides(tmp_path, extraction_location)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PPT 분석 오류: {str(e)}")
    finally:
        os.unlink(tmp_path)

    # 세션 생성
    session = create_session(
        ppt_filename=file.filename,
        prefix=prefix,
        extraction_location=extraction_location,
    )

    # 자동 선택된 슬라이드 텍스트를 세션에 저장
    for info in slides_info:
        if info.auto_selected and info.selected_text is not None:
            session.slides.append(SlideData(
                slide_number=info.slide_number,
                raw_text=info.selected_text,
            ))

    save_session(session)

    # 사용자가 직접 선택해야 할 슬라이드가 있는지 확인
    needs_selection = any(not s.auto_selected for s in slides_info)

    return UploadResponse(
        session_id=session.session_id,
        filename=file.filename,
        total_slides=len(slides_info),
        slides=slides_info,
        needs_selection=needs_selection,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2단계: 텍스트 상자 선택 (멀티 후보 슬라이드)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/select", response_model=SelectResponse)
async def select_textboxes(req: SelectRequest):
    """
    사용자가 선택한 텍스트 상자를 세션에 반영하고 접두어를 감지합니다.

    선택이 필요 없는 경우에도 호출 가능 (selections=[] 로 호출)
    """
    session = _get_session_or_404(req.session_id)

    # 선택 결과 반영: slide_number → textbox full_text
    # (selection 정보는 프론트에서 후보 목록을 갖고 있으므로 full_text를 직접 전달)
    # API를 단순하게 유지하기 위해 SelectionItem에 full_text 포함
    for sel in req.selections:
        # 이미 세션에 있는 슬라이드 데이터 업데이트
        existing = next(
            (s for s in session.slides if s.slide_number == sel.slide_number),
            None
        )
        if existing is None:
            session.slides.append(SlideData(
                slide_number=sel.slide_number,
                raw_text=sel.full_text,
            ))
        else:
            existing.raw_text = sel.full_text

    # 슬라이드 번호 순서로 정렬
    session.slides.sort(key=lambda s: s.slide_number)

    # 접두어 감지
    all_texts = [s.raw_text for s in session.slides]
    detected = detect_prefixes(all_texts)

    save_session(session)

    return SelectResponse(
        session_id=session.session_id,
        detected_prefixes=detected,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3단계: 접두어 확인 및 텍스트 정리, 검수 항목 추출
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/confirm-prefixes", response_model=ConfirmPrefixResponse)
async def confirm_prefixes(req: ConfirmPrefixRequest):
    """
    선택한 접두어를 제거하고 텍스트를 정리한 후 검수 항목을 추출합니다.
    """
    session = _get_session_or_404(req.session_id)

    # 각 슬라이드 텍스트 정리
    for slide in session.slides:
        slide.cleaned_text = clean_text(
            slide.raw_text,
            prefixes_to_remove=req.delete_prefixes,
        )

    save_session(session)

    # 검수 대상 항목 추출
    cleaned_texts = [s.cleaned_text for s in session.slides]
    raw_items = extract_review_items(cleaned_texts)

    review_items = [
        ReviewItem(text=item["text"], occurrences=item["occurrences"])
        for item in raw_items
    ]

    return ConfirmPrefixResponse(
        session_id=session.session_id,
        total_slides=len(session.slides),
        review_items=review_items,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4단계: Word 문서 생성
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    """
    검수 결과를 반영하여 Word 문서를 생성하고 다운로드 토큰을 반환합니다.
    """
    session = _get_session_or_404(req.session_id)

    decisions = [d.model_dump() for d in req.review_decisions]

    try:
        docx_bytes = generate_word(session, decisions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Word 생성 오류: {str(e)}")

    # 다운로드 토큰 생성
    token = str(uuid.uuid4())
    output_filename = f"{session.ppt_filename.rsplit('.', 1)[0]}.docx"
    _generated_files[token] = (output_filename, docx_bytes)

    return GenerateResponse(
        download_token=token,
        filename=output_filename,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5단계: Word 파일 다운로드
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/download/{token}")
async def download(token: str):
    """
    생성된 Word 파일을 다운로드합니다.
    다운로드 후 메모리에서 즉시 삭제합니다 (메모리 누수 방지).
    """
    entry = _generated_files.get(token)
    if not entry:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다. 토큰이 만료되었거나 잘못되었습니다.")

    filename, docx_bytes = entry

    # 다운로드 후 메모리에서 삭제
    _generated_files.pop(token, None)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# 보조 함수
# ─────────────────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: str) -> SessionData:
    """세션을 조회하고 없으면 404 오류를 발생시킵니다."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="세션을 찾을 수 없습니다. 파일을 다시 업로드해 주세요."
        )
    return session

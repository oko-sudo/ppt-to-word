"""
텍스트 분석 및 정리 서비스

- 반복 접두어 감지
- 텍스트 정리 (공백, 마커 제거)
- 비한글 구간 검출 (검수 대상 추출)
"""
import re
from collections import Counter

from config import PATTERNS


# ── 패턴 컴파일 ─────────────────────────────────────────────────────────────

# 슬라이드 마커 (#1, #3-1 등)
MARKER_RE = re.compile(PATTERNS["slide_marker"]["pattern"])

# 접두어 패턴 목록
PREFIX_PATTERNS = [
    re.compile(p, re.MULTILINE)
    for p in PATTERNS["prefix_detection"]["patterns"]
]
PREFIX_MIN_OCCURRENCES = PATTERNS["prefix_detection"]["min_occurrences"]

# 한글 음절 범위
KOREAN_RE = re.compile(
    r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]"
)

# 알파벳/숫자 포함 여부 확인
ALPHANUMERIC_RE = re.compile(r"[A-Za-z0-9]")


# ── 접두어 감지 ─────────────────────────────────────────────────────────────

def detect_prefixes(texts: list[str]) -> list[str]:
    """
    여러 슬라이드 텍스트에서 반복되는 접두어를 감지합니다.

    예: "나레이션: ...", "MC: ..." 등
    min_occurrences 이상 등장해야 접두어로 간주합니다.

    Args:
        texts: 슬라이드 텍스트 목록

    Returns:
        감지된 접두어 목록 (정렬: 등장 빈도 내림차순)
    """
    prefix_counter: Counter = Counter()

    for text in texts:
        for pattern in PREFIX_PATTERNS:
            for match in pattern.finditer(text):
                prefix = match.group(1).strip()  # 콜론 포함 접두어
                prefix_counter[prefix] += 1

    return [
        prefix
        for prefix, count in prefix_counter.most_common()
        if count >= PREFIX_MIN_OCCURRENCES
    ]


def remove_prefixes(text: str, prefixes: list[str]) -> str:
    """
    텍스트에서 지정된 접두어를 모두 제거합니다.

    Args:
        text: 원본 텍스트
        prefixes: 제거할 접두어 목록

    Returns:
        접두어가 제거된 텍스트
    """
    for prefix in prefixes:
        # 접두어 + 뒤따르는 공백 제거 (줄 시작 기준)
        escaped = re.escape(prefix)
        text = re.sub(
            rf"^{escaped}\s*",
            "",
            text,
            flags=re.MULTILINE,
        )
    return text


# ── 텍스트 정리 ─────────────────────────────────────────────────────────────

def clean_text(text: str, prefixes_to_remove: list[str] | None = None) -> str:
    """
    텍스트를 정리합니다:
    1. 접두어 제거
    2. 슬라이드 마커 제거 (#1, #3-1 등)
    3. 연속 공백을 하나로 변경

    Args:
        text: 원본 텍스트
        prefixes_to_remove: 제거할 접두어 목록

    Returns:
        정리된 텍스트
    """
    if prefixes_to_remove:
        text = remove_prefixes(text, prefixes_to_remove)

    # 슬라이드 마커 제거 (#1, #3-1 등)
    text = MARKER_RE.sub("", text)

    # 연속 공백을 하나로 (줄바꿈은 유지)
    text = re.sub(r"[ \t]{2,}", " ", text)

    # 각 줄의 앞뒤 공백 제거
    lines = [line.strip() for line in text.splitlines()]

    # 빈 줄 제거 후 다시 결합
    text = "\n".join(line for line in lines if line)

    return text


# ── 비한글 구간 검출 ────────────────────────────────────────────────────────

def extract_review_items(texts: list[str]) -> list[dict]:
    """
    텍스트 목록에서 검수 대상 항목을 추출합니다.

    검수 대상:
    - 영어 알파벳 포함 단어
    - 숫자
    - 괄호를 포함한 문자열
    - 한글이 아닌 연속 문자열

    같은 문자열은 하나로 묶어 등장 횟수를 집계합니다.

    Args:
        texts: 정리된 슬라이드 텍스트 목록

    Returns:
        [{"text": str, "occurrences": int}, ...] (빈도 내림차순)
    """
    counter: Counter = Counter()

    for text in texts:
        tokens = _tokenize_non_korean(text)
        for token in tokens:
            counter[token] += 1

    return [
        {"text": token, "occurrences": count}
        for token, count in counter.most_common()
    ]


def _tokenize_non_korean(text: str) -> list[str]:
    """
    텍스트를 한글/비한글 구간으로 분리하여 비한글 토큰을 반환합니다.

    알고리즘:
    1. 한글 음절과 공백으로 텍스트를 분리
    2. 알파벳 또는 숫자를 포함하는 비한글 구간만 선택
    3. 앞뒤 구두점 제거 후 반환

    예:
        "AI 시스템과 ChatGPT를 활용한 2026 분석 (Ver.2)"
        → ["AI", "ChatGPT", "2026", "(Ver.2)"]
    """
    # 한글 음절 범위와 공백으로 분리
    segments = re.split(
        r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s\r\n]+",
        text,
    )

    tokens = []
    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue
        # 알파벳 또는 숫자를 포함하는 경우만 검수 대상
        if ALPHANUMERIC_RE.search(segment):
            # 앞뒤의 단순 구두점 정리 (콤마, 마침표 등)
            cleaned = segment.strip(".,;!?")
            if cleaned and ALPHANUMERIC_RE.search(cleaned):
                tokens.append(cleaned)

    return tokens


# ── 검수 반영 ───────────────────────────────────────────────────────────────

def apply_review_decisions(text: str, decisions: list[dict]) -> str:
    """
    사용자의 검수 결과를 텍스트에 반영합니다.
    (Word 생성 시 서식 처리를 위한 plain-text 버전)

    규칙:
    - delete=True  → 해당 문자열 삭제
    - user_input   → "원문[입력값]" 형식으로 변경
    - 둘 다 없음   → 원문 유지

    Args:
        text: 정리된 원본 텍스트
        decisions: [{"text": str, "user_input": str, "delete": bool}, ...]

    Returns:
        검수가 반영된 텍스트
    """
    # delete 먼저 처리 (우선순위 높음)
    for d in decisions:
        if d.get("delete"):
            text = text.replace(d["text"], "")

    # user_input 처리
    for d in decisions:
        if not d.get("delete") and d.get("user_input"):
            replacement = f"{d['text']}[{d['user_input']}]"
            text = text.replace(d["text"], replacement)

    # 정리: 연속 공백 제거
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return text

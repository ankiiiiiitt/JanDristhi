"""Lightweight admission checks for citizen road-photo reports."""
from pathlib import Path
from typing import Tuple


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_SIGNATURES = (
    b"\xff\xd8\xff",                 # JPEG
    b"\x89PNG\r\n\x1a\n",           # PNG
    b"RIFF",                          # WebP (checked with WEBP marker below)
)


def validate_road_photo(path: Path, content_type: str | None, filename: str | None) -> Tuple[bool, str]:
    """Reject non-image submissions before AI processing.

    The road-damage model is then the semantic road-photo check: reports are only
    accepted after it has successfully run on this admitted image.
    """
    if content_type and content_type.lower() not in ALLOWED_IMAGE_TYPES:
        return False, "Please upload a JPEG, PNG, or WebP road photo."
    if Path(filename or "").suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
        return False, "The selected file is not a supported road-photo format."
    try:
        payload = path.read_bytes()
    except OSError:
        return False, "The photo could not be read. Please retake it."
    if len(payload) < 16:
        return False, "The photo is empty or incomplete. Please retake it."
    is_webp = payload.startswith(b"RIFF") and payload[8:12] == b"WEBP"
    if not any(payload.startswith(signature) for signature in IMAGE_SIGNATURES) or (payload.startswith(b"RIFF") and not is_webp):
        return False, "The uploaded file is not a valid camera image."
    return True, ""

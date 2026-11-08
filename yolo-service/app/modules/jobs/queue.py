
from app.core.config import settings
from app.core.supabase_client import get_supabase


def claim_next(worker_id: str) -> dict | None:
    """Ambil satu segmen berstatus 'queued' secara atomik (for update skip locked di SQL)."""
    res = get_supabase().rpc("claim_next_segment", {"p_worker": worker_id}).execute()
    rows = res.data or []
    return rows[0] if rows else None


def download(storage_path: str) -> bytes:
    return get_supabase().storage.from_(settings.segment_bucket).download(storage_path)


def delete_segment(storage_path: str) -> None:
    get_supabase().storage.from_(settings.segment_bucket).remove([storage_path])


def mark_done(segment_id: str) -> None:
    get_supabase().table("video_segments").update({"status": "done"}).eq("id", segment_id).execute()


def mark_failed(segment_id: str, error: str, attempts: int) -> str:
    """Kembali ke antrean sampai MAX_ATTEMPTS, setelah itu 'failed'."""
    final = attempts >= settings.max_attempts
    get_supabase().table("video_segments").update(
        {
            "status": "failed" if final else "queued",
            "error": error[:500],
            "locked_by": None,
            "locked_at": None,
        }
    ).eq("id", segment_id).execute()
    return "failed" if final else "queued"

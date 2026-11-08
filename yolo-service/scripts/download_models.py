"""Unduh bobot model dari bucket Supabase `models` ke folder models/.

Pemakaian: python -m scripts.download_models basketball.pt futsal.pt
Bobot tidak masuk git (rules.md bagian 7). Catat versinya di models/VERSIONS.md.
"""

import sys
from pathlib import Path

from app.core.config import settings
from app.core.supabase_client import get_supabase


def main(names: list[str]) -> None:
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    bucket = get_supabase().storage.from_(settings.models_bucket)
    for name in names:
        data = bucket.download(name)
        Path(settings.models_dir / name).write_bytes(data)
        print(f"ok {name} ({len(data) / 1e6:.1f} MB)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Pemakaian: python -m scripts.download_models <file.pt> [...]")
    main(sys.argv[1:])

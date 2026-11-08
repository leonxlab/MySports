"""Impor semua modul supaya detektor terdaftar di registry."""


def load_all() -> None:
    from app.modules import badminton, basketball, futsal, padel, tennis  # noqa: F401

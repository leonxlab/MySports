from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = "http://127.0.0.1:54321"
    supabase_service_role_key: str = ""
    backend_url: str = "http://localhost:3001"
    yolo_service_key: str = ""

    segment_bucket: str = "segments"
    models_bucket: str = "models"
    models_dir: Path = Path("./models")
    tmp_dir: Path = Path("./tmp")

    device: str = "auto"  # cuda | cpu | auto
    poll_interval_seconds: float = 2.0
    max_attempts: int = 3


settings = Settings()

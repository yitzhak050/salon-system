from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str

    # --- JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days (1 month)

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://myapp.com"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- SMS (optional, for future integration) ---
    SMS_PROVIDER_URL: Optional[str] = None
    SMS_API_KEY: Optional[str] = None

    # --- Volunteer goal (hours) ---
    VOLUNTEER_GOAL_HOURS: int = 60

    # --- Initial Super Admin User (Created automatically on startup if no users exist) ---
    FIRST_ADMIN_PHONE: str = "0501234567"
    FIRST_ADMIN_PASSWORD: str = "admin123"
    FIRST_ADMIN_NAME: str = "מנהל ראשי"


    # --- Default shift slots (labels only, not used for logic) ---
    SHIFT_MORNING_START: str = "10:00"
    SHIFT_MORNING_END: str = "14:00"
    SHIFT_AFTERNOON_START: str = "14:00"
    SHIFT_AFTERNOON_END: str = "18:00"
    SHIFT_EVENING_START: str = "18:00"
    SHIFT_EVENING_END: str = "22:00"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

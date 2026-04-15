from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
ONTOLOGY_FILE = BASE_DIR / "ontology" / "GamifyOnt.owl"
ONTOLOGY_PATH: str = str(ONTOLOGY_FILE)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str

    # CORS: comma-separated origins (e.g. http://localhost:3000,http://127.0.0.1:3000).
    # Empty uses local dev defaults. Do not use "*" with credentials.
    CORS_ORIGINS: str = ""

    JWT_SECRET_KEY: str = "gameforge-dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8

    # Ontology
    ONTOLOGY_PATH: str = ONTOLOGY_PATH

    # AI — offline | openai | local | huggingface
    # local: OpenAI-compatible Chat Completions (Ollama/LM Studio). Set OPENAI_BASE_URL e.g. http://127.0.0.1:11434/v1
    AI_MODE: str = "offline"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-5"
    OPENAI_BASE_URL: str | None = None

    HUGGINGFACE_API_TOKEN: str | None = None
    HUGGINGFACE_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"
    # Override full inference URL prefix (trailing slash optional); default HF serverless API
    HUGGINGFACE_INFERENCE_BASE: str | None = None

    # Auto-complete: max wall-clock wait for the threaded LLM loop (does not kill the worker thread).
    AI_AUTOCOMPLETE_TIMEOUT_SEC: float = 120.0


settings = Settings()
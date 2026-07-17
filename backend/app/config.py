from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://trayectoria:trayectoria@db:5432/trayectoria"
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import alumnos, catalogos, exportaciones, importaciones, indicadores
from app.config import settings

app = FastAPI(title="Sistema de Trayectoria Escolar", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(importaciones.router, prefix="/api/v1", tags=["importaciones"])
app.include_router(alumnos.router, prefix="/api/v1", tags=["alumnos"])
app.include_router(indicadores.router, prefix="/api/v1", tags=["indicadores"])
app.include_router(catalogos.router, prefix="/api/v1", tags=["catalogos"])
app.include_router(exportaciones.router, prefix="/api/v1", tags=["exportaciones"])


@app.get("/health")
def health():
    return {"status": "ok"}

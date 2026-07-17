import os

# Debe fijarse antes de importar app.db.base, que crea el engine al importarse.
os.environ.setdefault("DATABASE_URL", "sqlite://")

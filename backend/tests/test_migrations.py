import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect

BACKEND = Path(__file__).resolve().parent.parent


def test_alembic_upgrade_head_creates_every_model_table_and_column(tmp_path):
    """A fresh database built only from migrations (as on Neon/Render) must match the models exactly."""
    db = tmp_path / "mig.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db}", "SECRET_KEY": "x" * 40}
    r = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]

    import app.models  # noqa: F401  (register all tables)
    from app.core.database import Base

    insp = inspect(create_engine(f"sqlite:///{db}"))
    have = set(insp.get_table_names())
    problems = []
    for t in Base.metadata.sorted_tables:
        if t.name not in have:
            problems.append(f"missing table {t.name}")
            continue
        cols = {c["name"] for c in insp.get_columns(t.name)}
        problems += [f"{t.name}.{c.name} missing" for c in t.columns if c.name not in cols]
    assert not problems, problems

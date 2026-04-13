"""SQLite database setup for the monitoring module.

Creates the eval_results table if it doesn't exist.
Stores every evaluation run with a timestamp so results
persist even after the server restarts.
"""

import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path

# Database file lives in the project root
DB_PATH = Path("ai_ops.db")


def get_connection():
    """Get a SQLite connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    return conn


def init_db():
    """Create the eval_results table if it doesn't exist yet."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS eval_results (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id      TEXT    NOT NULL,
            service_name    TEXT    NOT NULL,
            quality_score   REAL    NOT NULL,
            drift_flagged   INTEGER NOT NULL,
            drift_threshold REAL    NOT NULL,
            checks          TEXT    NOT NULL,
            triggered_by    TEXT    NOT NULL,
            evaluated_at    TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_eval_result(result: dict):
    """Save one evaluation result to SQLite."""
    conn = get_connection()
    conn.execute("""
        INSERT INTO eval_results
            (service_id, service_name, quality_score, drift_flagged,
             drift_threshold, checks, triggered_by, evaluated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        result["service_id"],
        result["service_name"],
        result["quality_score"],
        1 if result["drift_flagged"] else 0,
        result["drift_threshold"],
        json.dumps(result["checks"]),   # store list as JSON string
        result["triggered_by"],
        result["evaluated_at"],
    ))
    conn.commit()
    conn.close()


def get_all_eval_results() -> list[dict]:
    """Fetch all eval results from SQLite, newest first."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT * FROM eval_results
        ORDER BY evaluated_at DESC
    """).fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "id":              row["id"],
            "service_id":      row["service_id"],
            "service_name":    row["service_name"],
            "quality_score":   row["quality_score"],
            "drift_flagged":   bool(row["drift_flagged"]),
            "drift_threshold": row["drift_threshold"],
            "checks":          json.loads(row["checks"]),
            "triggered_by":    row["triggered_by"],
            "evaluated_at":    row["evaluated_at"],
        })
    return results
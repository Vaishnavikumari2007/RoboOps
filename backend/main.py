"""
main.py
-------
FastAPI application entry point.

Starts the server, creates DB tables, mounts all routers, and enables CORS
so the React frontend (running on port 5173) can talk to this server.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import reports, issues, tasks, dashboard, audit

# ---------------------------------------------------------------------------
# Create the FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title       = "RoboOps API",
    description = (
        "Backend for RoboOps — a robotics team management tool. "
        "Handles reports, issue analysis, task simulation, and audit logging."
    ),
    version = "1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server to call this API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ---------------------------------------------------------------------------
# Create database tables on startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    init_db()
    print("RoboOps database ready.")

# ---------------------------------------------------------------------------
# Mount routers
# ---------------------------------------------------------------------------
app.include_router(reports.router)
app.include_router(issues.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(audit.router)

# ---------------------------------------------------------------------------
# Health check — useful to confirm the server is running
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "RoboOps API"}

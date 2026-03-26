"""
Axiom Sentinel — AI Operations Control Room
FastAPI application entry point
"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os

app = FastAPI(title="Axiom Sentinel", description="AI Operations Control Room")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
templates_dir = os.path.join(os.path.dirname(__file__), "templates")

app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request, "active_page": "dashboard"})


@app.get("/registry", response_class=HTMLResponse)
async def registry(request: Request):
    return templates.TemplateResponse("registry.html", {"request": request, "active_page": "registry"})


@app.get("/service-detail", response_class=HTMLResponse)
async def service_detail(request: Request):
    return templates.TemplateResponse("service_detail.html", {"request": request, "active_page": "service-detail"})


@app.get("/incidents", response_class=HTMLResponse)
async def incidents(request: Request):
    return templates.TemplateResponse("incidents.html", {"request": request, "active_page": "incidents"})


@app.get("/maintenance", response_class=HTMLResponse)
async def maintenance(request: Request):
    return templates.TemplateResponse("maintenance.html", {"request": request, "active_page": "maintenance"})


@app.get("/governance", response_class=HTMLResponse)
async def governance(request: Request):
    return templates.TemplateResponse("governance.html", {"request": request, "active_page": "governance"})

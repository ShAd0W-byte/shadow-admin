# =========================================
# app/main.py
# =========================================

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from bot.janitor import start_background_janitor

from app.db import engine
from app.routes.servers import router as servers_router
from app.routes.internal import router as internal_router


app = FastAPI(
    title="Shadow Admin CTF",
    description="Authorization Drift via Parser Discrepancy",
    version="1.0",
)

# -----------------------------------------
# Static Files (CSS + JS)
# -----------------------------------------
app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static",
)

# -----------------------------------------
# Templates
# -----------------------------------------
templates = Jinja2Templates(directory="app/templates")


# -----------------------------------------
# Startup DB Check
# -----------------------------------------
@app.on_event("startup")
def startup():
    with engine.connect():
        pass

    # Start janitor automatically
    start_background_janitor()


# -----------------------------------------
# Frontend Pages
# -----------------------------------------

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request},
    )


@app.get("/server", response_class=HTMLResponse)
def server_page(request: Request):
    return templates.TemplateResponse(
        "server.html",
        {"request": request},
    )


@app.get("/quarantine", response_class=HTMLResponse)
def quarantine_page(request: Request):
    return templates.TemplateResponse(
        "quarantine.html",
        {"request": request},
    )


# -----------------------------------------
# API Routers
# -----------------------------------------
app.include_router(servers_router)
app.include_router(internal_router)


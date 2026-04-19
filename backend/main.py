from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from adaptive_tracking import evaluate_adaptation_event
from database import (
    create_user_session,
    delete_user_session as remove_user_session,
    fetch_user_session,
    update_user_session,
)
from model import AdaptationEvaluateRequest, AdaptationEvaluateResponse, UserSessionData

app = FastAPI()

origins = ["http://localhost:3000",
"https://final-year-project-nine-red.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Any Vercel deployment (production, previews, renamed projects)
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/api/user_session", response_model=UserSessionData)
async def post_user_session(user_session: UserSessionData):
    response = await create_user_session(user_session)
    if response:
        return user_session
    raise HTTPException(400, "Something went wrong")

@app.get("/api/user_session/{id}", response_model=UserSessionData)
async def get_user_session(id: int):
    response = await fetch_user_session(id)
    if response:
        return response
    raise HTTPException(404, "Session not found")

@app.put("/api/user_session/{id}", response_model=UserSessionData)
async def put_user_session(id: int, user_session: UserSessionData):
    response = await update_user_session(id, user_session.model_dump())
    if response:
        return response
    raise HTTPException(400, "Something went wrong")
    

@app.delete("/api/user_session/{id}")
async def delete_user_session(id: int):
    response = await remove_user_session(id)
    if response:
        return "Successfully deleted session"
    raise HTTPException(400, "Something went wrong")


async def _require_session_dict(session_id: int) -> dict:
    document = await fetch_user_session(session_id)
    if not document:
        raise HTTPException(404, "Session not found")
    return dict(document)


@app.post("/api/adaptation/evaluate", response_model=AdaptationEvaluateResponse)
async def post_adaptation_evaluate(body: AdaptationEvaluateRequest):
    session_dict = await _require_session_dict(body.session_id)
    return evaluate_adaptation_event(
        body.event,
        body.payload or {},
        body.context or {},
        session_dict,
    )
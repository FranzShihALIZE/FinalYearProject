import os

import motor.motor_asyncio

from model import UserSessionData

# When MONGO_URL is not set on Railway (same as previous default).
_RAILWAY_INTERNAL_FALLBACK = (
    "mongodb://mongo:qGwSIQWAErpDohpUkvuuVFFzQMIjkwsO@mongodb.railway.internal:27017"
)

#Get the MongoDB URI 
def get_mongo_uri() -> str:
    """Prefer env vars; else Railway internal on Railway; else local Mongo."""
    uri = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    if uri:
        return uri
    if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("RAILWAY_PROJECT_ID"):
        return _RAILWAY_INTERNAL_FALLBACK
    return "mongodb://localhost:27017"


client = motor.motor_asyncio.AsyncIOMotorClient(get_mongo_uri())
database = client.testSessions
collection = database.userSession

#Fetch a user session by id
async def fetch_user_session(id: int):
    document = await collection.find_one({"id": id})
    return document

#Fetch all user sessions
async def fetch_all_user_sessions():
    sessions = []
    cursor = collection.find({})
    async for document in cursor:
        sessions.append(UserSessionData(**document))
    return sessions

#Create a new user session
async def create_user_session(user_session: UserSessionData):
    document = user_session.model_dump()
    result = await collection.insert_one(document)
    return result

#Update a user session by id
async def update_user_session(id: int, data: dict):
    await collection.update_one({"id": id}, {"$set": data})
    document = await collection.find_one({"id": id})
    return document

#Delete a user session by id
async def delete_user_session(id: int):
    await collection.delete_one({"id": id})
    return True


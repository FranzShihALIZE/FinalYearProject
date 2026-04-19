import motor.motor_asyncio

from model import UserSessionData

client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
database = client.testSessions
collection = database.userSession


async def fetch_user_session(id: int):
    document = await collection.find_one({"id": id})
    return document


async def fetch_all_user_sessions():
    sessions = []
    cursor = collection.find({})
    async for document in cursor:
        sessions.append(UserSessionData(**document))
    return sessions


async def create_user_session(user_session: UserSessionData):
    document = user_session.model_dump()
    result = await collection.insert_one(document)
    return result


async def update_user_session(id: int, data: dict):
    await collection.update_one({"id": id}, {"$set": data})
    document = await collection.find_one({"id": id})
    return document

async def delete_user_session(id: int):
    await collection.delete_one({"id": id})
    return True


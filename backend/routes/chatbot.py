"""
Chatbot API routes — Groq-powered CuraTrack support assistant.
"""
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from services.chatbot_service import chat, chat_stream

logger = logging.getLogger("curatrack.chatbot_route")
router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/chatbot")
async def chatbot_reply(body: ChatRequest):
    """
    Send conversation history to Groq and get a reply.
    Returns { reply: "..." }
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    try:
        reply = chat(messages)
        return JSONResponse(content={"reply": reply})
    except RuntimeError as e:
        logger.error("Chatbot error: %s", e)
        return JSONResponse(
            status_code=500,
            content={"reply": "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", "error": str(e)}
        )


@router.post("/chatbot/stream")
async def chatbot_stream(body: ChatRequest):
    """
    Stream conversation response from Groq via Server-Sent Events.
    Each chunk is sent as: data: <text>\n\n
    Final chunk: data: [DONE]\n\n
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    def event_generator():
        try:
            for chunk in chat_stream(messages):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error("Stream error: %s", e)
            yield f"data: [ERROR: {str(e)}]\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

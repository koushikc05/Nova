import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pydantic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={GEMINI_API_KEY}"

class ChatRequest(pydantic.BaseModel):
    history: list

SYSTEM_PROMPT = """You are Nova, a sharp and friendly AI tutor. Be encouraging, patient, and never condescending. Use simple language first, then build complexity. Always use short analogies or real-world examples. End every response with a tip, a follow-up question, or encouragement to go deeper. If a student seems stuck, break it into smaller steps. Keep responses concise (3–6 sentences) unless detailed explanation is genuinely needed. If a topic is selected, tailor your explanation to that subject. Never say 'great question!' — show genuine interest through your explanation instead."""

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_API_KEY":
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured.")

    payload = {
        "system_instruction": {
            "parts": [
                {
                    "text": SYSTEM_PROMPT
                }
            ]
        },
        "contents": request.history
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GEMINI_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {"reply": text}
            else:
                raise HTTPException(status_code=500, detail="Unexpected response format from Gemini API.")
                
        except httpx.HTTPStatusError as e:
            print(f"Gemini API Error: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Gemini API error: {e.response.text}")
        except Exception as e:
            print(f"Server Error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

# Mount frontend directory for static files (CSS, JS, HTML)
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

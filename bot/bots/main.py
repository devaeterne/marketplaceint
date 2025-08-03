from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import subprocess
import os

app = FastAPI()


class BotRequest(BaseModel):
    bot_name: str

class TermsPayload(BaseModel):
    terms: List[str]


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bot"}


@app.get("/terms")
async def get_terms():
    file_path = "/app/search_terms/terms.txt"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="terms.txt dosyası bulunamadı")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            terms = [line.strip() for line in f if line.strip()]
        return {
            "success": True,
            "terms": terms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terimler alınamadı: {str(e)}")


@app.post("/terms")
async def update_terms(payload: TermsPayload):
    file_path = "/app/search_terms/terms.txt"

    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "w", encoding="utf-8") as f:
            for term in payload.terms:
                f.write(term.strip() + "\n")

        return {
            "success": True,
            "message": "Arama terimleri güncellendi",
            "terms": payload.terms
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"terms.txt güncellenemedi: {str(e)}")


@app.get("/")
async def root():
    return {
        "service": "Marketplace Bot Service",
        "endpoints": [
            "/health",
            "/terms",
            "POST /terms",
            "/run-trendyol",
            "/run-n11",
            "/run-hepsiburada",
            "/run-avansas",
            "...detail botları"
        ]
    }

# ======================== BOT ENDPOINTLERİ ========================

def run_bot_file(filepath: str, bot_name: str):
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"{bot_name} bulunamadı")

    try:
        result = subprocess.run(
            ["python3", filepath],
            capture_output=True,
            text=True,
            timeout=900
        )
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "bot": bot_name
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": f"{bot_name} zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"{bot_name} hatası: {str(e)}"}

@app.post("/run-trendyol")
async def run_trendyol(request: BotRequest = BotRequest(bot_name="trendyol")):
    return run_bot_file(f"/app/bots/{request.bot_name}.py", request.bot_name)

@app.post("/run-trendyol-detail")
async def run_trendyol_detail(request: BotRequest = BotRequest(bot_name="trendyol")):
    return run_bot_file(f"/app/bots/{request.bot_name}Detay.py", f"{request.bot_name}Detay")

@app.post("/run-n11")
async def run_n11():
    return run_bot_file("/app/bots/n11.py", "n11")

@app.post("/run-n11-detail")
async def run_n11_detail():
    return run_bot_file("/app/bots/n11Detay.py", "n11Detay")

@app.post("/run-hepsiburada")
async def run_hepsiburada(request: BotRequest = BotRequest(bot_name="hepsiburada")):
    return run_bot_file(f"/app/bots/{request.bot_name}.py", request.bot_name)

@app.post("/run-hepsiburada-detail")
async def run_hepsiburada_detail(request: BotRequest = BotRequest(bot_name="hepsiburada")):
    return run_bot_file(f"/app/bots/{request.bot_name}Detay.py", f"{request.bot_name}Detay")

@app.post("/run-avansas")
async def run_avansas(request: BotRequest = BotRequest(bot_name="avansas")):
    return run_bot_file(f"/app/bots/{request.bot_name}.py", request.bot_name)

@app.post("/run-avansas-detail")
async def run_avansas_detail(request: BotRequest = BotRequest(bot_name="avansas")):
    return run_bot_file(f"/app/bots/{request.bot_name}Detay.py", f"{request.bot_name}Detay")

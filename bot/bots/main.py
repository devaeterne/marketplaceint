from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os

app = FastAPI()


class BotRequest(BaseModel):
    bot_name: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bot"}


@app.post("/run-trendyol")
async def run_trendyol(request: BotRequest):
    bot_name = request.bot_name.strip()
    bot_path = f"/app/bots/{bot_name}.py"

    if not os.path.exists(bot_path):
        raise HTTPException(status_code=404, detail=f"Bot bulunamadı: {bot_name}.py")

    print(f"▶️ Bot çalıştırılıyor: {bot_path}")
    try:
        result = subprocess.run(
            ["python3", bot_path],
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
        return {"status": "error", "message": "Bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Hata: {str(e)}"}


@app.post("/run-trendyol-detail")
async def run_trendyol_detail(request: BotRequest):
    bot_name = request.bot_name.strip()
    detail_bot_path = f"/app/bots/{bot_name}Detay.py"

    if not os.path.exists(detail_bot_path):
        raise HTTPException(status_code=404, detail=f"Detay bot bulunamadı: {bot_name}Detay.py")

    print(f"▶️ Detay bot çalıştırılıyor: {detail_bot_path}")
    try:
        result = subprocess.run(
            ["python3", detail_bot_path],
            capture_output=True,
            text=True,
            timeout=900
        )
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "bot": f"{bot_name}Detay"
        }

    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Detay bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Detay bot hatası: {str(e)}"}


@app.post("/run-n11")
async def run_n11():
    bot_path = "/app/bots/n11.py"
    if not os.path.exists(bot_path):
        raise HTTPException(status_code=404, detail="N11 bot bulunamadı")

    print(f"▶️ N11 bot çalıştırılıyor: {bot_path}")
    try:
        result = subprocess.run(
            ["python3", bot_path],
            capture_output=True,
            text=True,
            timeout=900
        )
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "bot": "n11"
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "N11 bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"N11 bot hatası: {str(e)}"}


@app.post("/run-n11-detail")
async def run_n11_detail():
    detail_bot_path = "/app/bots/n11Detay.py"
    if not os.path.exists(detail_bot_path):
        # Try lowercase version
        detail_bot_path = "/app/bots/n11detay.py"
        if not os.path.exists(detail_bot_path):
            raise HTTPException(status_code=404, detail="N11 detay bot bulunamadı")

    print(f"▶️ N11 detay bot çalıştırılıyor: {detail_bot_path}")
    try:
        result = subprocess.run(
            ["python3", detail_bot_path],
            capture_output=True,
            text=True,
            timeout=900
        )
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "bot": "n11Detay"
        }

    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "N11 detay bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"N11 detay bot hatası: {str(e)}"}


@app.get("/")
async def root():
    return {
        "service": "Marketplace Bot Service",
        "endpoints": [
            "/health",
            "/run-trendyol",
            "/run-trendyol-detail",
            "/run-n11",
            "/run-n11-detail"
        ]
    }
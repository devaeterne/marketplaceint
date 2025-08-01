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


@app.get("/")
async def root():
    return {
        "service": "Marketplace Bot Service",
        "endpoints": [
            "/health",
            "/run-trendyol",
            "/run-trendyol-detail",
            "/run-n11",
            "/run-n11-detail",
            "/run-hepsiburada",
            "/run-hepsiburada-detail"
        ]
    }


# === Trendyol ===
@app.post("/run-trendyol")
async def run_trendyol(request: BotRequest = BotRequest(bot_name="trendyol")):
    bot_path = f"/app/bots/{request.bot_name}.py"
    if not os.path.exists(bot_path):
        raise HTTPException(status_code=404, detail=f"Bot bulunamadı: {request.bot_name}.py")

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
            "bot": request.bot_name
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Hata: {str(e)}"}


@app.post("/run-trendyol-detail")
async def run_trendyol_detail(request: BotRequest = BotRequest(bot_name="trendyol")):
    detail_bot_path = f"/app/bots/{request.bot_name}Detay.py"
    if not os.path.exists(detail_bot_path):
        raise HTTPException(status_code=404, detail=f"Detay bot bulunamadı: {request.bot_name}Detay.py")

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
            "bot": f"{request.bot_name}Detay"
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Detay bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Detay bot hatası: {str(e)}"}


# === N11 ===
@app.post("/run-n11")
async def run_n11():
    bot_path = "/app/bots/n11.py"
    if not os.path.exists(bot_path):
        raise HTTPException(status_code=404, detail="N11 bot bulunamadı")

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
        detail_bot_path = "/app/bots/n11detay.py"
        if not os.path.exists(detail_bot_path):
            raise HTTPException(status_code=404, detail="N11 detay bot bulunamadı")

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


# === Hepsiburada ===
@app.post("/run-hepsiburada")
async def run_hepsiburada(request: BotRequest = BotRequest(bot_name="hepsiburada")):
    bot_path = f"/app/bots/{request.bot_name}.py"
    if not os.path.exists(bot_path):
        raise HTTPException(status_code=404, detail=f"Hepsiburada bot bulunamadı: {request.bot_name}.py")

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
            "bot": request.bot_name
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Hepsiburada bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Hepsiburada bot hatası: {str(e)}"}


@app.post("/run-hepsiburada-detail")
async def run_hepsiburada_detail(request: BotRequest = BotRequest(bot_name="hepsiburada")):
    detail_bot_path = f"/app/bots/{request.bot_name}Detay.py"
    if not os.path.exists(detail_bot_path):
        raise HTTPException(status_code=404, detail=f"Detay bot bulunamadı: {request.bot_name}Detay.py")

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
            "bot": f"{request.bot_name}Detay"
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Hepsiburada detay bot zaman aşımına uğradı (15 dakika)"}
    except Exception as e:
        return {"status": "error", "message": f"Hepsiburada detay bot hatası: {str(e)}"}

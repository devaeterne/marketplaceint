from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import os

app = FastAPI()


class BotRequest(BaseModel):
    bot_name: str


@app.post("/run-trendyol")
async def run_bot(request: BotRequest):
    bot_name = request.bot_name.strip()
    bot_path = f"/app/bots/{bot_name}.py"

    if not os.path.exists(bot_path):
        return {"status": "error", "message": f"❌ Bot bulunamadı: {bot_name}.py"}

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
            "stderr": result.stderr
        }

    except Exception as e:
        return {"status": "error", "message": f"⚠️ Hata: {str(e)}"}


@app.post("/run-trendyol-detail")
async def run_detail_bot(request: BotRequest):
    bot_name = request.bot_name.strip()
    detail_bot_path = f"/app/bots/{bot_name}Detay.py"

    if not os.path.exists(detail_bot_path):
        return {"status": "error", "message": f"❌ Detay bot bulunamadı: {bot_name}Detay.py"}

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
            "stderr": result.stderr
        }

    except Exception as e:
        return {"status": "error", "message": f"⚠️ Detay bot hatası: {str(e)}"}

@app.post("/run-n11")
async def run_n11():
    bot_path = "/app/bots/n11.py"
    if not os.path.exists(bot_path):
        return {"status": "error", "message": f"❌ Bot bulunamadı: n11.py"}

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
            "stderr": result.stderr
        }
    except Exception as e:
        return {"status": "error", "message": f"⚠️ N11 bot hatası: {str(e)}"}


@app.post("/run-n11-detail")
async def run_n11_detail():
    detail_bot_path = "/app/bots/n11Detay.py"
    if not os.path.exists(detail_bot_path):
        return {"status": "error", "message": "❌ Detay bot bulunamadı."}

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
            "stderr": result.stderr
        }

    except Exception as e:
        return {"status": "error", "message": f"⚠️ N11 detay bot hatası: {str(e)}"}

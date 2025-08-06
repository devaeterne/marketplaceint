# log_handler.py
import logging
import os

def setup_logger(bot_name: str) -> logging.Logger:
    logger = logging.getLogger(bot_name)
    logger.setLevel(logging.INFO)

    if logger.hasHandlers():
        return logger  # tekrar handler ekleme

    # Docker volume altındaki path
    log_dir = "/app/bot_logs"
    os.makedirs(log_dir, exist_ok=True)

    log_path = os.path.join(log_dir, f"{bot_name}_latest.log")

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger

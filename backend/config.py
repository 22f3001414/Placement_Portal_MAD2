import os
from datetime import timedelta
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

class Config:

    SECRET_KEY = os.getenv("SECRET_KEY")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///ppa.db"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    REDIS_URL = os.getenv(
        "REDIS_URL",
        "redis://localhost:6379/0"
    )

    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL

    # Celery 5
    broker_url = REDIS_URL
    result_backend = REDIS_URL

    beat_schedule = {
        "close-expired-drives": {
            "task": "tasks.tasks.close_expired_drives",
            "schedule": crontab(hour=0, minute=0),
        },
        "send-drive-reminders": {
            "task": "tasks.tasks.send_drive_reminders",
            "schedule": crontab(hour=9, minute=0),
        },
        "send-monthly-report": {
            "task": "tasks.tasks.send_monthly_report",
            "schedule": crontab(day_of_month=1, hour=6, minute=0),
        },
    }

    # Flask-Caching

    CACHE_TYPE = "RedisCache"

    CACHE_REDIS_URL = os.getenv(
        "CACHE_REDIS_URL",
        "redis://localhost:6379/1"
    )

    CACHE_DEFAULT_TIMEOUT = 120

    # Mail

    MAIL_SERVER = os.getenv("MAIL_SERVER")

    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))

    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True") == "True"

    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "False") == "True"

    MAIL_USERNAME = os.getenv("MAIL_USERNAME")

    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")

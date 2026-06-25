import os
from datetime import timedelta
from celery.schedules import crontab


class Config:
    SECRET_KEY = 'ppa-secret-key-change-in-prod'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ppa.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'ppa-jwt-super-secret-key-for-placement-portal-2026'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    REDIS_URL = 'redis://localhost:6379/0'
    CELERY_BROKER_URL = 'redis://localhost:6379/0'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
    # Celery 5 new-style keys (avoids deprecation warnings)
    broker_url = 'redis://localhost:6379/0'
    result_backend = 'redis://localhost:6379/0'
    beat_schedule = {
        'close-expired-drives': {
            'task': 'tasks.tasks.close_expired_drives',
            'schedule': crontab(hour=0, minute=0),
        },
        'send-drive-reminders': {
            'task': 'tasks.tasks.send_drive_reminders',
            'schedule': crontab(hour=9, minute=0),
        },
        'send-monthly-report': {
            'task': 'tasks.tasks.send_monthly_report',
            'schedule': crontab(day_of_month=1, hour=6, minute=0),
        },
    }

    # Flask-Caching (Redis backend)
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_URL = 'redis://localhost:6379/1'   # DB 1 to separate from Celery
    CACHE_DEFAULT_TIMEOUT = 120                     # 2 minutes default
    
    # Flask-Mail SMTP Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False') == 'True'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'shirsamaitra@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'bkln ldgq udet asiq')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'shirsamaitra@gmail.com')

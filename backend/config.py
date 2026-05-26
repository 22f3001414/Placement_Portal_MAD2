from datetime import timedelta

class Config:
    SECRET_KEY = 'ppa-secret-key-change-in-prod'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ppa.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'ppa-jwt-super-secret-key-for-placement-portal-2026'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    REDIS_URL = 'redis://localhost:6379/0'
    CELERY_BROKER_URL = 'redis://localhost:6379/0'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

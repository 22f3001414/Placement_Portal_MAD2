# Placement Portal Application

A full-stack **Placement Portal Application** developed as part of the **Modern Application Development II (MAD-II)** course for the **IIT Madras BS Degree Programme**.

The application provides a centralized platform for managing campus placements, supporting three different user roles: **Admin**, **Company**, and **Student**. It enables placement drive management, student applications, interview scheduling, resume management, asynchronous background processing, and email notifications.

---

## Features

### Admin
- Manage students and companies
- Approve or reject company registrations
- Approve or reject placement drives
- Activate/deactivate users
- Blacklist users
- View student resumes
- Generate monthly placement reports

### Company
- Register and manage company profile
- Create placement drives
- View applicants
- Review student resumes
- Shortlist, reject, or select candidates
- Schedule interviews
- Send interview notification emails

### Student
- Register and manage profile
- Upload and download resume
- Browse eligible placement drives
- Apply for placement drives
- View application history
- View interview details
- Export application history as CSV

---

## Technology Stack

### Backend
- Flask
- SQLAlchemy
- Flask-JWT-Extended
- Flask-Mail
- Flask-Caching
- Celery
- Redis

### Frontend
- Vue.js
- Bootstrap 5
- Chart.js

### Database
- SQLite

---

## Key Features

- JWT-based Authentication
- Role-Based Access Control (RBAC)
- Resume Upload & Viewing
- Placement Drive Management
- Interview Scheduling
- Email Notifications
- Redis Caching
- Celery Background Tasks
- CSV Export
- Monthly HTML Reports
- RESTful API Architecture

---

## Project Structure

```
backend/
    routes/
    models/
    tasks/
    uploads/
    reports/
    exports/

frontend/
    src/
        components/
        router.js
        main.js
    index.html
```

---

## Running the Application

Start the required services:

- Flask Backend
- Redis Server
- Celery Worker
- Celery Beat Scheduler

Then open:

```
http://127.0.0.1:5000
```

---

## Course Information

**Course:** Modern Application Development II (MAD-II)

**Programme:** IIT Madras BS Degree Programme

---

## Author

**Shirsa Maitra**
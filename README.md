# מערכת ניהול התנדבות 🤝

מערכת ניהול מתנדבים לעמותה — כולל ניהול משמרות, שיבוץ מתנדבים, מעקב שעות, התראות ודוחות PDF.

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL 16 |
| Frontend | React 18 + Vite + MUI v5 |
| Container | Docker + Docker Compose |

---

## מבנה הפרויקט

```
salon/
├── docker-compose.yml
├── .env.example           # העתק ל-.env ומלא סיסמאות
├── backend/
│   ├── app/
│   │   ├── api/           # Routers (Controllers)
│   │   ├── services/      # Business Logic
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic Schemas
│   │   ├── db/            # DB session + Audit middleware
│   │   └── tests/         # pytest
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/         # Login, AdminDashboard, VolunteerPortal
        ├── components/    # Navbar, Calendar, ProgressBar
        └── services/      # API calls
```

---

## הרצה מהירה

### דרישות מוקדמות
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) מותקן ופועל

### שלבים

```bash
# 1. העתק קובץ הסביבה
cp .env.example .env

# 2. הרם את כל השירותים
docker-compose up --build

# 3. פתח בדפדפן:
#    Frontend:  http://localhost:5173
#    API Docs:  http://localhost:8000/docs
```

---

## משתמשים ותפקידים

| תפקיד | הרשאות |
|---|---|
| `SALON_MANAGER` (מנהל סלון) | יצירת משתמשים, פתיחת חודש, צפייה בכל הדוחות |
| `SALON_OPERATOR` (מפעיל סלון) | צפייה בלוח, ניהול משמרות, דוחות |
| `EVENT_VOLUNTEER` (מתנדב) | שיבוץ עצמי, clock-in/out, צפייה בשעות אישיות |

> **שים לב:** יצירת משתמש חדש אפשרית **רק על-ידי מנהל סלון**.

---

## API Documentation

לאחר `docker-compose up`, גלוש אל:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## הרצת בדיקות (Tests)

```bash
# בתוך container
docker-compose exec backend pytest app/tests/ -v

# מחוץ ל-Docker (בסביבת פיתוח מקומית)
cd backend
pip install -r requirements.txt
pytest app/tests/ -v --tb=short
```

---

## משמרות ברירת מחדל

| משמרת | שעות |
|---|---|
| בוקר | 10:00 – 14:00 |
| צהריים | 14:00 – 18:00 |
| ערב | 18:00 – 22:00 |

---

## חיבור SMS (עתידי)

הקובץ `backend/app/services/notification_service.py` מכיל `send_sms_stub()` מוכנה לחיבור.
מלא את `SMS_PROVIDER_URL` ו-`SMS_API_KEY` בקובץ `.env` ועדכן את הפונקציה.

---

## רישיון

פרויקט פנים-ארגוני לשימוש העמותה בלבד.

# מערכת ניהול התנדבות 🤝

מערכת מקיפה וידידותית לניהול התנדבות ומשמרות עבור עמותות וארגונים — כולל ניהול לוח משמרות, שיבוץ וביטול עצמי למתנדבים, דיווח ומעקב שעות בזמן אמת, התראות SMS, ייצוא דוחות PDF מעוצבים בעברית, וממשק ניהול משתמשים מתקדם.

---

## 👨‍💻 קרדיטים ופיתוח

- **פיתוח ואפיון:** **יצחק גרוס** ([050yitzhak@gmail.com](mailto:050yitzhak@gmail.com))
- **ייעוד מקורי:** פותח באהבה עבור עמותת **"יוצאים לשינוי"**
- פרויקט קוד פתוח מוכן להתקנה עצמית עבור עמותות וארגונים חברתיים.

---

## 🌟 תכונות עיקריות ושינויים שבוצעו במערכת

- **שעון חי ותאריך עדכני (Live Clock & Calendar):** תצוגת זמן وتאריך בזמן אמת ב-Navbar העליון לפי אזור הזמן של ישראל.
- **התאמה מלאה לשעון ישראל (`Asia/Jerusalem`):** טיפול מדויק בחילופי שעון קיץ/חורף, חישובי שעות ומשמרות ללא פערי UTC.
- **הגבלת הרשמות למשמרות עבר:** מניעת שיבוץ עצמי או ביטול למשמרות שכבר החלו או הסתיימו.
- **ניהול סטטוס מתנדבים (Active / Inactive):** השבתה/הפעלה מחדש של משתמשים עם שמירת היסטוריית פעילות מלאה.
- **מחיקת משתמש בטוחה (Hard Delete):** ניקוי שיבוצים ורישומים מקושרים בעת מחיקת משתמש ללא יצירת שגיאות Database.
- **חוויית התחברות משודרגת:** אפשרות חשיפה/הסתרה של סיסמה (עין) במסך הכניסה וקישור לתמיכה וקרדיט.
- **דוחות PDF מקצועיים בעברית:** הפקת דוחות נוכחות וסיכומי שעות חודשיים עם תמיכה מלאה ביישור ימין-לשמאל (RTL).
- **תמיכה ב-Production ובשרתים אישיים:** תמיכה מובנית ב-Docker מלא (כולל Nginx לפרונטאנד), קובץ פריסה ל-Render (`render.yaml`), ותמיכה בכתובות API דינמיות דרך משתני סביבה (`VITE_API_BASE_URL`).

---

## 🛠️ טכנולוגיות

| שכבה | טכנולוגיה | שימוש |
|---|---|---|
| **Backend** | Python 3.11 + FastAPI | שרת REST API מהיר ומאובטח, תיעוד אוטומטי, אימות JWT |
| **Database** | PostgreSQL 16 | בסיס נתונים רלציוני עם תמיכה ב-Asyncpg ו-SQLAlchemy 2.0 |
| **Frontend** | React 18 + Vite + MUI v5 | ממשק משתמש מודרני, רספונסיבי, תמיכה מלאה ב-RTL ועברית |
| **Web Server** | Nginx Alpine | הגשת הפרונטאנד בסביבת ייצור (Production) ופרוקסי ל-API |
| **Container** | Docker + Docker Compose | אריזה מלאה של כלל חלקי המערכת לפריסה בכל שרת |

---

## 📂 מבנה הפרויקט

```
salon/
├── docker-compose.yml       # הרמת כל השירותים בפקודה אחת
├── render.yaml              # פריסה אוטומטית לענן Render
├── .env.example             # קובץ דוגמה למשתני סביבה
├── backend/
│   ├── app/
│   │   ├── api/             # נקודות קצה (Auth, Shifts, Users, Reports וכו')
│   │   ├── services/        # לוגיקה עסקית, חישוב שעות ודוחות PDF
│   │   ├── models/          # טבלאות בסיס הנתונים (SQLAlchemy ORM)
│   │   ├── schemas/         # מודלים של Pydantic לאימות נתונים
│   │   ├── db/              # חיבור ל-DB, Audit log ו-Migrations
│   │   └── tests/           # בדיקות תוכנה אוטומטיות (pytest)
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/           # Login, AdminDashboard, VolunteerPortal, UsersManagement
    │   ├── components/      # Navbar, Clock, Calendar, ShiftCard, ShiftModal
    │   └── services/        # תקשורת מול ה-API
    ├── nginx.conf           # קונפיגורציית Nginx לפרודקשן
    └── Dockerfile
```

---

## 🚀 הוראות התקנה והרצה (Self-Hosting על כל שרת)

ניתן להתקין את המערכת בכל מחשב או שרת פרטי (VPS כגון Ubuntu, Debian, CentOS, Windows Server או מחשב מקומי).

### דרישות מוקדמות
1. **Docker** ו-**Docker Compose** מותקנים:
   - [מדריך התקנת Docker ב-Ubuntu/Debian](https://docs.docker.com/engine/install/ubuntu/)
   - [הורדת Docker Desktop (Windows / Mac)](https://www.docker.com/products/docker-desktop/)
2. חיבור לאינטרנט וגישת Shell / Terminal לשרת.

---

### שלב 1: שכפול הפרויקט (Clone)

```bash
git clone https://github.com/yitzhak050/salon-system.git
cd salon-system
```

---

### שלב 2: הגדרת משתני סביבה (`.env`)

העתק את קובץ הדוגמה לקובץ `.env`:

```bash
cp .env.example .env
```

פתח את קובץ `.env` בעזרת עורך טקסט (כגון `nano .env`) ועדכן את הערכים הבאים:

```env
# סיסמאות ומאגר נתונים
POSTGRES_USER=salon_user
POSTGRES_PASSWORD=בחר_סיסמה_חזקה_למסד_הנתונים
POSTGRES_DB=salon_db

# אבטחת טוקנים (JWT)
SECRET_KEY=הזן_כאן_מחרוזת_סודית_ארוכה_ואקראית
ACCESS_TOKEN_EXPIRE_MINUTES=480

# פרטי מנהל ראשי ראשוני (נוצר אוטומטית בעלייה ראשונה)
FIRST_ADMIN_PHONE=0501234567
FIRST_ADMIN_PASSWORD=הזן_סיסמה_למנהל
FIRST_ADMIN_NAME=מנהל ראשי

# (אופציונלי) אם המערכת יושבת מאחורי דומיין חיצוני נפרד לפרונטאנד ולבקאנד:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

---

### שלב 3: הפעלת המערכת

הרץ את הפקודה הבאה להרמת כל הקונטיינרים:

```bash
docker-compose up -d --build
```

הפקודה תוריד את האימג'ים הנדרשים, תבנה את ה-Backend וה-Frontend, ותפעיל את המערכת ברקע:
- **Frontend (ממשק משתמש):** זמין בפורט `80` (למשל: `http://localhost` או כתובת ה-IP של השרת שלך).
- **Backend API & Swagger Docs:** זמין בפורט `8000` (למשל: `http://localhost:8000/docs`).

> 💡 **טיפ:** אם מוגדר בשרת שרת פרוקסי קיים (Nginx / Caddy / Traefik) עבור תעודות SSL (HTTPS), הפנה את התעבורה לפורט `80` עבור הפרונטאנד ולפורט `8000` עבור הבקאנד (או הגדר reverse proxy מתאים).

---

### שלב 4: התחברות ראשונית

1. גלוש בדפדפן לכתובת השרת (לדוגמה `http://YOUR_SERVER_IP` או `http://localhost`).
2. הזן את פרטי המנהל שהוגדרו בקובץ `.env` (`FIRST_ADMIN_PHONE` ו-`FIRST_ADMIN_PASSWORD`).
3. מתוך מסך הניהול תוכל:
   - ליצור משתמשים חדשים (מנהלים, מפעילים ומתנדבים).
   - לפתוח חודשי פעילות ולוחות משמרות.
   - להפיק דוחות שעות ולעקוב אחר פעילות המתנדבים.

---

## 👥 תפקידים והרשאות במערכת

| תפקיד | קוד הרשאה | תיאור והרשאות |
|---|---|---|
| **מנהל סלון** | `SALON_MANAGER` | שליטה מלאה: יצירה וניהול משתמשים, פתיחת חודש פעילות, עריכת כל המשמרות והפקת כל הדוחות. |
| **מפעיל סלון** | `SALON_OPERATOR` | ניהול שוטף: צפייה בלוח המשמרות, שיבוץ מתנדבים, דיווח נוכחות וצפייה בדוחות. |
| **מתנדב** | `EVENT_VOLUNTEER` | ממשק אישי: צפייה במשמרות פתוחות, שיבוץ/ביטול עצמי (למשמרות עתידיות), כניסה ויציאה ממשמרת (Clock-in/out) וצפייה בשעות אישיות. |

---

## 📊 ממשק בדיקות ופיתוח (API & Tests)

### תיעוד API אינטראקטיבי
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### הרצת בדיקות אוטומטיות (Tests)
```bash
# בתוך הקונטיינר של ה-Backend:
docker-compose exec backend pytest app/tests/ -v

# מקומית (ללא Docker):
cd backend
pip install -r requirements.txt
pytest app/tests/ -v --tb=short
```

---

## 📱 חיבור הודעות SMS

המערכת כוללת תשתית מובנית להתראות SMS (אישור שיבוץ, תזכורת למשמרת וכו').
בקובץ `backend/app/services/notification_service.py` קיימת פונקציית `send_sms_stub()`.
על מנת לחבר ספק SMS חיצוני:
1. הגדר בקובץ `.env` את `SMS_PROVIDER_URL` ו-`SMS_API_KEY`.
2. התאם את מבנה הקריאה ב-`send_sms_stub()` ל-API של ספק ה-SMS שלך (כגון 019, InforU, Twilio וכד').

---

## 📜 רישיון ותנאי שימוש

המערכת פותחה ע"י **יצחק גרוס** כפרויקט חברתי למען עמותות וארגונים.  
השימוש, ההתאמה וההפצה מותרים למטרות פעילות חברתית והתנדבותית.

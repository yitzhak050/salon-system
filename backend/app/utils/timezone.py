"""
Timezone utilities – always use Israel time (Asia/Jerusalem).
Import `now_il` wherever you need the current datetime.
"""
import datetime

ISRAEL_TZ = datetime.timezone(datetime.timedelta(hours=2))  # UTC+2 (winter)
# For automatic DST handling, install pytz and use:
#   import pytz; ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")


def now_il() -> datetime.datetime:
    """Return the current datetime in Israel time (timezone-aware)."""
    return datetime.datetime.now(tz=ISRAEL_TZ)


def now_il_naive() -> datetime.datetime:
    """Return the current datetime in Israel time WITHOUT tzinfo (for DB columns)."""
    return now_il().replace(tzinfo=None)

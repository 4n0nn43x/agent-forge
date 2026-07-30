"""Time helpers."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time as a naive datetime.

    `datetime.utcnow()` is deprecated from Python 3.12, but the columns storing
    these values are plain `DateTime` on SQLite, whose result parser rejects a
    UTC offset suffix. Returning a naive value keeps the stored format
    byte-identical to what existing rows use.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)

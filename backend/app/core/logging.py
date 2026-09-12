import logging
import logging.config


class RequestIDFilter(logging.Filter):
    """Add the current request ID to log records when available."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


def configure_logging() -> None:
    """Configure application-wide logging."""

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {
                "()": RequestIDFilter,
            },
        },
        "formatters": {
            "default": {
                "format": (
                    "%(asctime)s | %(levelname)s | "
                    "%(name)s | request_id=%(request_id)s | "
                    "%(message)s"
                ),
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "filters": ["request_id"],
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console"],
        },
    }

    logging.config.dictConfig(logging_config)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for the requested module."""

    return logging.getLogger(name)
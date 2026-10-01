from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import get_settings
from app.core.exceptions import EduSphereException


logger = logging.getLogger(__name__)


class EmailDeliveryError(EduSphereException):
    """Raised when an email cannot be delivered."""

    status_code = 503
    code = "EMAIL_DELIVERY_FAILED"


class EmailService:
    """
    Central SMTP email service for EduSphere.

    SMTP credentials are loaded from application settings/environment.
    No credentials are hardcoded in this service.

    Gmail recommended configuration:
        SMTP_ENABLED=True
        SMTP_HOST=smtp.gmail.com
        SMTP_PORT=587
        SMTP_USE_TLS=True
        SMTP_USE_SSL=False
        SMTP_USERNAME=<gmail address>
        SMTP_PASSWORD=<Google App Password>
        SMTP_FROM_EMAIL=<same gmail address>
        SMTP_FROM_NAME=EduSphere

    Gmail can also use:
        SMTP_PORT=465
        SMTP_USE_TLS=False
        SMTP_USE_SSL=True

    IMPORTANT:
    For Gmail, SMTP_PASSWORD must be a Google App Password when
    two-step verification is enabled. Do not use the normal Gmail
    account password.
    """

    @staticmethod
    def _settings():
        return get_settings()

    @staticmethod
    def _clean_username(value: str | None) -> str:
        return str(value or "").strip()

    @staticmethod
    def _clean_password(value: str | None) -> str:
        """
        Remove whitespace from SMTP passwords.

        Google App Passwords are sometimes displayed like:
            xxxx xxxx xxxx xxxx

        SMTP authentication needs:
            xxxxxxxxxxxxxxxx
        """
        return "".join(str(value or "").split())

    @staticmethod
    def _validate_configuration(settings) -> tuple[str, str, str]:
        if not settings.smtp_enabled:
            raise EmailDeliveryError(
                "Email delivery is currently disabled.",
                code="EMAIL_DISABLED",
            )

        host = str(settings.smtp_host or "").strip()
        username = EmailService._clean_username(settings.smtp_username)
        password = EmailService._clean_password(settings.smtp_password)
        from_email = str(settings.smtp_from_email or "").strip()

        missing: list[str] = []

        if not host:
            missing.append("SMTP_HOST")

        if not username:
            missing.append("SMTP_USERNAME")

        if not password:
            missing.append("SMTP_PASSWORD")

        if not from_email:
            missing.append("SMTP_FROM_EMAIL")

        if missing:
            raise EmailDeliveryError(
                "Email service is not configured correctly.",
                code="EMAIL_CONFIGURATION_ERROR",
                details={"missing": missing},
            )

        use_tls = bool(settings.smtp_use_tls)
        use_ssl = bool(settings.smtp_use_ssl)

        if use_tls and use_ssl:
            raise EmailDeliveryError(
                "SMTP TLS and SSL cannot both be enabled.",
                code="EMAIL_CONFIGURATION_ERROR",
            )

        port = int(settings.smtp_port)

        if port < 1 or port > 65535:
            raise EmailDeliveryError(
                "SMTP port is invalid.",
                code="EMAIL_CONFIGURATION_ERROR",
            )

        if host.lower() == "smtp.gmail.com":
            if port == 587 and not use_tls:
                raise EmailDeliveryError(
                    "Gmail port 587 requires SMTP_USE_TLS=True.",
                    code="EMAIL_GMAIL_CONFIGURATION_ERROR",
                )

            if port == 465 and not use_ssl:
                raise EmailDeliveryError(
                    "Gmail port 465 requires SMTP_USE_SSL=True.",
                    code="EMAIL_GMAIL_CONFIGURATION_ERROR",
                )

            if from_email.lower() != username.lower():
                logger.warning(
                    "SMTP_FROM_EMAIL differs from SMTP_USERNAME for Gmail. "
                    "The authenticated Gmail account will be used as sender."
                )

        return username, password, from_email

    @staticmethod
    def _sender_address(
        *,
        settings,
        username: str,
        from_email: str,
    ) -> str:
        host = str(settings.smtp_host or "").strip().lower()
        from_name = str(settings.smtp_from_name or "").strip()

        # Gmail should use the authenticated account as sender.
        sender = username if host == "smtp.gmail.com" else from_email

        if from_name:
            return formataddr((from_name, sender))

        return sender

    @staticmethod
    def _build_message(
        *,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
        settings=None,
        username: str | None = None,
        from_email: str | None = None,
    ) -> EmailMessage:
        recipient = str(recipient or "").strip()
        subject = str(subject or "").strip()
        text_body = str(text_body or "")

        if not recipient:
            raise EmailDeliveryError(
                "Recipient email address is required.",
                code="EMAIL_RECIPIENT_REQUIRED",
            )

        if not subject:
            raise EmailDeliveryError(
                "Email subject is required.",
                code="EMAIL_SUBJECT_REQUIRED",
            )

        if not text_body.strip():
            raise EmailDeliveryError(
                "Email body is required.",
                code="EMAIL_BODY_REQUIRED",
            )

        message = EmailMessage()

        if settings is not None and username and from_email:
            message["From"] = EmailService._sender_address(
                settings=settings,
                username=username,
                from_email=from_email,
            )

        message["To"] = recipient
        message["Subject"] = subject

        message.set_content(text_body)

        if html_body:
            message.add_alternative(
                html_body,
                subtype="html",
            )

        return message

    @staticmethod
    def _send_message(message: EmailMessage) -> None:
        settings = EmailService._settings()

        username, password, from_email = (
            EmailService._validate_configuration(settings)
        )

        host = str(settings.smtp_host).strip()
        port = int(settings.smtp_port)

        # Avoid accidentally duplicating From if callers supplied one.
        if "From" not in message:
            message["From"] = EmailService._sender_address(
                settings=settings,
                username=username,
                from_email=from_email,
            )

        smtp = None

        try:
            logger.info(
                "Connecting to SMTP server host=%s port=%s tls=%s ssl=%s",
                host,
                port,
                bool(settings.smtp_use_tls),
                bool(settings.smtp_use_ssl),
            )

            if bool(settings.smtp_use_ssl):
                smtp = smtplib.SMTP_SSL(
                    host,
                    port,
                    timeout=20,
                )
            else:
                smtp = smtplib.SMTP(
                    host,
                    port,
                    timeout=20,
                )

            with smtp:
                smtp.ehlo()

                if bool(settings.smtp_use_tls):
                    smtp.starttls()
                    smtp.ehlo()

                # SMTP username/password are required by the current
                # EduSphere configuration validation.
                smtp.login(
                    username,
                    password,
                )

                smtp.send_message(message)

            logger.info(
                "Email sent successfully to recipient=%s",
                message.get("To"),
            )

        except smtplib.SMTPAuthenticationError as exc:
            logger.error(
                "SMTP authentication failed for username=%s. "
                "For Gmail, SMTP_PASSWORD must be a valid Google App Password "
                "belonging to SMTP_USERNAME.",
                username,
            )

            raise EmailDeliveryError(
                "Email service authentication failed. "
                "For Gmail, use a Google App Password instead of the normal "
                "Gmail account password.",
                code="EMAIL_SMTP_AUTH_FAILED",
            ) from exc

        except smtplib.SMTPConnectError as exc:
            logger.exception("SMTP connection failed.")

            raise EmailDeliveryError(
                "Unable to connect to the email service.",
                code="EMAIL_SMTP_CONNECTION_FAILED",
            ) from exc

        except smtplib.SMTPRecipientsRefused as exc:
            logger.exception("SMTP recipient was refused.")

            raise EmailDeliveryError(
                "The recipient email address was refused by the email service.",
                code="EMAIL_SMTP_RECIPIENT_REFUSED",
            ) from exc

        except smtplib.SMTPSenderRefused as exc:
            logger.exception("SMTP sender was refused.")

            raise EmailDeliveryError(
                "The configured sender email address was refused by the email service.",
                code="EMAIL_SMTP_SENDER_REFUSED",
            ) from exc

        except smtplib.SMTPDataError as exc:
            logger.exception("SMTP server rejected the email data.")

            raise EmailDeliveryError(
                "The email service rejected the message.",
                code="EMAIL_SMTP_DATA_FAILED",
            ) from exc

        except (TimeoutError, ConnectionError, OSError) as exc:
            logger.exception("Unable to connect to SMTP server.")

            raise EmailDeliveryError(
                "Unable to connect to the email service.",
                code="EMAIL_SMTP_CONNECTION_FAILED",
            ) from exc

        except smtplib.SMTPException as exc:
            logger.exception("SMTP delivery failed.")

            raise EmailDeliveryError(
                "Email delivery failed.",
                code="EMAIL_SMTP_FAILED",
            ) from exc

        except Exception as exc:
            logger.exception("Unexpected email delivery error.")

            raise EmailDeliveryError(
                "Unexpected email delivery error.",
                code="EMAIL_DELIVERY_FAILED",
            ) from exc

    @staticmethod
    def send_email(
        *,
        recipient: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
    ) -> None:
        settings = EmailService._settings()

        username, _password, from_email = (
            EmailService._validate_configuration(settings)
        )

        message = EmailService._build_message(
            recipient=recipient,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
            settings=settings,
            username=username,
            from_email=from_email,
        )

        EmailService._send_message(message)

    @staticmethod
    def send_mfa_email_otp(
        *,
        recipient: str,
        otp_code: str,
        expires_in_minutes: int,
    ) -> None:
        """
        Send MFA login OTP to the user's registered email address.
        """
        recipient = str(recipient or "").strip()
        otp_code = str(otp_code or "").strip()

        if not recipient:
            raise EmailDeliveryError(
                "Recipient email address is required.",
                code="EMAIL_RECIPIENT_REQUIRED",
            )

        if not otp_code.isdigit():
            raise EmailDeliveryError(
                "Invalid OTP value.",
                code="EMAIL_OTP_DELIVERY_INVALID",
            )

        if len(otp_code) < 6 or len(otp_code) > 8:
            raise EmailDeliveryError(
                "Invalid OTP length.",
                code="EMAIL_OTP_DELIVERY_INVALID",
            )

        if int(expires_in_minutes) <= 0:
            raise EmailDeliveryError(
                "Invalid OTP expiration period.",
                code="EMAIL_OTP_DELIVERY_INVALID",
            )

        subject = "EduSphere — Your login verification code"

        text_body = (
            "EduSphere Login Verification\n\n"
            f"Your verification code is: {otp_code}\n\n"
            f"This code will expire in {expires_in_minutes} minutes.\n\n"
            "If you did not try to sign in to EduSphere, "
            "you can safely ignore this email.\n\n"
            "For your security, never share this verification code "
            "with anyone."
        )

        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EduSphere Login Verification</title>
</head>

<body style="
    margin:0;
    padding:0;
    background:#f4f6f8;
    font-family:Arial,Helvetica,sans-serif;
">
<div style="
    max-width:520px;
    margin:40px auto;
    padding:24px;
">
<div style="
    background:#ffffff;
    border-radius:16px;
    padding:32px;
    border:1px solid #e5e7eb;
    box-shadow:0 8px 30px rgba(15,23,42,0.08);
">

<div style="
    display:flex;
    align-items:center;
    gap:12px;
    margin-bottom:24px;
">
<div style="
    width:42px;
    height:42px;
    line-height:42px;
    text-align:center;
    border-radius:10px;
    background:#11143f;
    color:#ffffff;
    font-size:20px;
    font-weight:800;
">E</div>

<div>
<div style="
    color:#11143f;
    font-size:20px;
    font-weight:800;
">EduSphere</div>

<div style="
    color:#8792a2;
    font-size:12px;
    margin-top:2px;
">School Operating System</div>
</div>
</div>

<h2 style="
    margin:0 0 10px;
    color:#172033;
    font-size:22px;
">
Login verification
</h2>

<p style="
    margin:0;
    color:#4b5563;
    line-height:1.6;
    font-size:15px;
">
Use the following verification code to complete your EduSphere sign-in.
</p>

<div style="
    margin:28px 0;
    padding:20px;
    text-align:center;
    background:#f5f6fb;
    border:1px solid #e4e7f0;
    border-radius:12px;
">

<div style="
    color:#7b8494;
    font-size:11px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:1px;
    margin-bottom:10px;
">
Verification code
</div>

<div style="
    color:#11143f;
    font-size:32px;
    font-weight:800;
    letter-spacing:8px;
    line-height:1.2;
">
{otp_code}
</div>

</div>

<p style="
    color:#4b5563;
    line-height:1.6;
    font-size:14px;
">
This code will expire in
<strong>{expires_in_minutes} minutes</strong>.
</p>

<div style="
    margin-top:22px;
    padding:13px 14px;
    background:#fff8e8;
    border:1px solid #f3dfac;
    border-radius:9px;
    color:#72520b;
    font-size:13px;
    line-height:1.5;
">
Never share this code with anyone.
EduSphere support will never ask for your login OTP.
</div>

<p style="
    color:#6b7280;
    font-size:13px;
    line-height:1.6;
    margin-bottom:0;
">
If you did not try to sign in to EduSphere,
you can safely ignore this email.
</p>

</div>

<p style="
    text-align:center;
    color:#9ca3af;
    font-size:12px;
    margin-top:20px;
">
EduSphere School Operating System
</p>

</div>
</body>
</html>
"""

        EmailService.send_email(
            recipient=recipient,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )

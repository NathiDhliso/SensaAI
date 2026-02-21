import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

BRAND_NAME = "SensaAI"
BRAND_TAGLINE = "Learning, Reimagined"
COLOR_AMETHYST = "#6B46C1"
COLOR_PLUM = "#7C2D92"
COLOR_ACCENT_LIGHT = "#8b5cf6"
COLOR_CORAL = "#F97316"
COLOR_BG = "#0f0b1a"
COLOR_CARD = "#1a1425"
COLOR_CARD_INNER = "#221a33"
COLOR_TEXT = "#e8e0f0"
COLOR_TEXT_MUTED = "#9a8cb8"
COLOR_BORDER = "#2d2440"


def _base_template(title: str, heading: str, subtitle: str, body_html: str, footer_note: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:{COLOR_BG};font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{COLOR_BG};padding:48px 20px;">
<tr><td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

<tr><td style="text-align:center;padding-bottom:32px;">
<div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:16px;background:linear-gradient(135deg,{COLOR_AMETHYST},{COLOR_PLUM});color:#ffffff;font-size:24px;font-weight:800;text-align:center;letter-spacing:-1px;box-shadow:0 8px 32px rgba(107,70,193,0.4);">
S
</div>
</td></tr>

<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{COLOR_CARD};border-radius:20px;overflow:hidden;border:1px solid {COLOR_BORDER};box-shadow:0 24px 48px rgba(0,0,0,0.4);">

<tr><td style="padding:40px 40px 0;text-align:center;">
<div style="display:inline-block;padding:4px 14px;background:linear-gradient(135deg,rgba(107,70,193,0.2),rgba(124,45,146,0.2));border:1px solid rgba(139,92,246,0.3);border-radius:100px;margin-bottom:20px;">
<span style="font-size:11px;font-weight:600;color:{COLOR_ACCENT_LIGHT};text-transform:uppercase;letter-spacing:1.5px;">{BRAND_TAGLINE}</span>
</div>
<h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">{heading}</h1>
<p style="margin:0;color:{COLOR_TEXT_MUTED};font-size:14px;line-height:1.5;">{subtitle}</p>
</td></tr>

<tr><td style="padding:32px 40px;">
<div style="background-color:{COLOR_CARD_INNER};border-radius:12px;border:1px solid {COLOR_BORDER};padding:28px;">
{body_html}
</div>
</td></tr>

<tr><td style="padding:0 40px 32px;text-align:center;">
<div style="height:1px;background:linear-gradient(90deg,transparent,{COLOR_BORDER},transparent);margin-bottom:20px;"></div>
<p style="margin:0 0 4px;font-size:11px;color:{COLOR_TEXT_MUTED};line-height:1.6;">
{footer_note}
</p>
<p style="margin:0;font-size:11px;color:rgba(154,140,184,0.5);line-height:1.6;">
Sent by {BRAND_NAME} &middot; AI-powered learning platform
</p>
</td></tr>

</table>
</td></tr>

<tr><td style="text-align:center;padding-top:24px;">
<p style="margin:0;font-size:11px;color:rgba(154,140,184,0.4);">
If you did not request this email, you can safely ignore it.
</p>
</td></tr>

</table>

</td></tr>
</table>
</body>
</html>"""


def _code_block_html(code_placeholder: str) -> str:
    return f"""<div style="text-align:center;margin:20px 0 16px;">
<div style="display:inline-block;padding:18px 36px;background:linear-gradient(135deg,rgba(107,70,193,0.15),rgba(124,45,146,0.15));border:1px solid rgba(139,92,246,0.3);border-radius:12px;letter-spacing:8px;font-size:32px;font-weight:700;color:#ffffff;font-family:'Courier New','Lucida Console',monospace;">{code_placeholder}</div>
</div>
<p style="margin:0;text-align:center;font-size:12px;color:{COLOR_TEXT_MUTED};">Valid for 24 hours</p>"""


def _signup_verification(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Verify Your Email"
    body = f"""<p style="margin:0 0 16px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Welcome to the future of learning.</p>
<p style="margin:0 0 24px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Enter the verification code below to activate your {BRAND_NAME} account and start generating AI-powered study materials.</p>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="Verify Your Email",
        subtitle="One step away from smarter learning",
        body_html=body,
        footer_note=f"You're receiving this because you created a {BRAND_NAME} account."
    )
    return subject, html


def _forgot_password(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Reset Your Password"
    body = f"""<p style="margin:0 0 16px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">We received a request to reset your password.</p>
<p style="margin:0 0 24px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Enter the code below on the reset page to choose a new password.</p>
{_code_block_html(code_param)}
<p style="margin:16px 0 0;text-align:center;font-size:13px;color:{COLOR_TEXT_MUTED};">Didn't request this? Your account is secure — no action needed.</p>"""
    html = _base_template(
        title=subject,
        heading="Reset Your Password",
        subtitle="Secure access to your learning journey",
        body_html=body,
        footer_note=""
    )
    return subject, html


def _resend_code(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Your New Verification Code"
    body = f"""<p style="margin:0 0 16px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Here's your new verification code.</p>
<p style="margin:0 0 24px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Enter it on the verification page to confirm your email address.</p>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="New Verification Code",
        subtitle="Let's get you verified",
        body_html=body,
        footer_note=f"You requested a new code for your {BRAND_NAME} account."
    )
    return subject, html


def _admin_create_user(code_param: str, username: str) -> tuple:
    subject = f"{BRAND_NAME} — You've Been Invited"
    body = f"""<p style="margin:0 0 16px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">You've been invited to join {BRAND_NAME} — an AI-powered learning platform that generates exam-ready study materials in minutes.</p>
<p style="margin:0 0 20px;font-size:15px;color:{COLOR_TEXT};line-height:1.7;">Sign in with the credentials below. You'll set a new password on first login.</p>
<div style="background:rgba(107,70,193,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:12px 16px;margin-bottom:20px;">
<p style="margin:0 0 2px;font-size:11px;color:{COLOR_TEXT_MUTED};text-transform:uppercase;letter-spacing:1px;">Username</p>
<p style="margin:0;font-size:15px;color:#ffffff;font-weight:600;">{username}</p>
</div>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="You're Invited",
        subtitle="Your learning journey starts here",
        body_html=body,
        footer_note="An administrator created this account for you."
    )
    return subject, html


def lambda_handler(event, context):
    trigger = event.get("triggerSource", "")
    code_param = event["request"].get("codeParameter", "{####}")
    username = event.get("userName", "")

    logger.info(f"CustomMessage trigger: {trigger} for user: {username}")

    if trigger == "CustomMessage_SignUp":
        subject, html = _signup_verification(code_param)
    elif trigger == "CustomMessage_ForgotPassword":
        subject, html = _forgot_password(code_param)
    elif trigger == "CustomMessage_ResendCode":
        subject, html = _resend_code(code_param)
    elif trigger == "CustomMessage_AdminCreateUser":
        subject, html = _admin_create_user(code_param, username)
    else:
        logger.info(f"Unhandled trigger: {trigger}, using default")
        return event

    event["response"]["emailSubject"] = subject
    event["response"]["emailMessage"] = html

    return event

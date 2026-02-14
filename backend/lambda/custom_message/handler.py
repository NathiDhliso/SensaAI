import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

BRAND_COLOR = "#7c3aed"
BRAND_NAME = "SensaPBL"
LOGO_TEXT = "S"


def _base_template(title: str, heading: str, body_html: str, footer_note: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr><td style="background:linear-gradient(135deg,{BRAND_COLOR},#6d28d9);padding:32px 32px 24px;text-align:center;">
<div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background:rgba(255,255,255,0.2);color:#ffffff;font-size:22px;font-weight:700;text-align:center;margin-bottom:12px;">{LOGO_TEXT}</div>
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">{heading}</h1>
</td></tr>

<tr><td style="padding:32px;">
{body_html}
</td></tr>

<tr><td style="padding:0 32px 24px;text-align:center;">
<p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
{footer_note}
This email was sent by {BRAND_NAME}. If you did not request this, you can safely ignore it.
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _code_block_html(code_placeholder: str) -> str:
    return f"""<div style="text-align:center;margin:24px 0;">
<div style="display:inline-block;padding:16px 32px;background-color:#f4f4f5;border-radius:8px;border:1px solid #e4e4e7;letter-spacing:6px;font-size:28px;font-weight:700;color:#18181b;font-family:'Courier New',monospace;">{code_placeholder}</div>
</div>
<p style="margin:0;text-align:center;font-size:13px;color:#71717a;">This code expires in 24 hours.</p>"""


def _signup_verification(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Verify Your Email"
    body = f"""<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">Welcome to {BRAND_NAME}!</p>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">Enter the code below to verify your email address and activate your account.</p>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="Verify Your Email",
        body_html=body,
        footer_note="You're receiving this because you created a SensaPBL account. "
    )
    return subject, html


def _forgot_password(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Reset Your Password"
    body = f"""<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">We received a request to reset your password.</p>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">Enter the code below on the reset page to set a new password.</p>
{_code_block_html(code_param)}
<p style="margin:16px 0 0;text-align:center;font-size:13px;color:#71717a;">If you didn't request this, your account is still secure — no action needed.</p>"""
    html = _base_template(
        title=subject,
        heading="Reset Your Password",
        body_html=body,
        footer_note=""
    )
    return subject, html


def _resend_code(code_param: str) -> tuple:
    subject = f"{BRAND_NAME} — Your New Verification Code"
    body = f"""<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">Here's your new verification code.</p>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">Enter it on the verification page to confirm your email address.</p>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="New Verification Code",
        body_html=body,
        footer_note="You requested a new code for your SensaPBL account. "
    )
    return subject, html


def _admin_create_user(code_param: str, username: str) -> tuple:
    subject = f"{BRAND_NAME} — You've Been Invited"
    body = f"""<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;line-height:1.6;">You've been invited to join {BRAND_NAME}.</p>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">Your temporary password is below. You'll be asked to set a new password on first sign-in.</p>
<p style="margin:0 0 4px;font-size:13px;color:#71717a;">Username</p>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;font-weight:600;">{username}</p>
{_code_block_html(code_param)}"""
    html = _base_template(
        title=subject,
        heading="You're Invited",
        body_html=body,
        footer_note="An administrator created this account for you. "
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

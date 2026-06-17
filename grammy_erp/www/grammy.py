import frappe

no_cache = 1


def get_context(context):
    # Same-origin auth: require an ERPNext login; otherwise bounce to /login.
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/grammy"
        raise frappe.Redirect

    # Expose the CSRF token + user to the SPA (read by the ERPNext API client).
    context.csrf_token = frappe.sessions.get_csrf_token()
    context.boot_user = frappe.session.user
    return context

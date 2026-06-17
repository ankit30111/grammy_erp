app_name = "grammy_erp"
app_title = "Grammy Erp"
app_publisher = "Grammy Electronics"
app_description = "Same-origin front-end serving + Grammy customizations on ERPNext"
app_email = "ankitmalhotra92@gmail.com"
app_license = "MIT"

# Serve the Grammy single-page app at /grammy (and all client-side routes under it).
website_route_rules = [
    {"from_route": "/grammy/<path:app_path>", "to_route": "grammy"},
]

# Apply Grammy customizations on every migrate/deploy (idempotent + version-controlled).
after_migrate = [
    "grammy_erp.setup.supplier_custom_fields.apply",
]

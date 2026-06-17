"""Grammy ERP - Supplier custom fields for the Vendors screen (upgrade-safe)."""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def apply():
    fields = {
        "Supplier": [
            {"fieldname": "custom_grammy_section", "label": "Grammy Vendor Details",
             "fieldtype": "Section Break", "insert_after": "supplier_group"},
            {"fieldname": "custom_contact_person_name", "label": "Contact Person Name",
             "fieldtype": "Data", "insert_after": "custom_grammy_section"},
            {"fieldname": "custom_email", "label": "Contact Email",
             "fieldtype": "Data", "options": "Email", "insert_after": "custom_contact_person_name"},
            {"fieldname": "custom_contact_number", "label": "Contact Number",
             "fieldtype": "Data", "insert_after": "custom_email"},
            {"fieldname": "custom_address", "label": "Address",
             "fieldtype": "Small Text", "insert_after": "custom_contact_number"},
            {"fieldname": "custom_finance_section", "label": "Bank & Certificates (Admin)",
             "fieldtype": "Section Break", "insert_after": "custom_address", "permlevel": 1},
            {"fieldname": "custom_bank_account_number", "label": "Bank Account Number",
             "fieldtype": "Data", "insert_after": "custom_finance_section", "permlevel": 1},
            {"fieldname": "custom_ifsc_code", "label": "IFSC Code",
             "fieldtype": "Data", "insert_after": "custom_bank_account_number", "permlevel": 1},
            {"fieldname": "custom_gst_certificate", "label": "GST Certificate",
             "fieldtype": "Attach", "insert_after": "custom_ifsc_code", "permlevel": 1},
            {"fieldname": "custom_msme_certificate", "label": "MSME/UDYAM Certificate",
             "fieldtype": "Attach", "insert_after": "custom_gst_certificate", "permlevel": 1},
        ]
    }
    create_custom_fields(fields, update=True)

    for role in ("Accounts Manager", "System Manager"):
        if not frappe.db.exists("Custom DocPerm",
                                {"parent": "Supplier", "role": role, "permlevel": 1}):
            frappe.get_doc({
                "doctype": "Custom DocPerm", "parent": "Supplier",
                "parenttype": "DocType", "parentfield": "permissions",
                "role": role, "permlevel": 1, "read": 1, "write": 1,
            }).insert(ignore_permissions=True)
    frappe.db.commit()

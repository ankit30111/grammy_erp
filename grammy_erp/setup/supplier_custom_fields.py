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
            {"fieldname": "custom_bank_account_number", "label": "Bank Account Number",
             "fieldtype": "Data", "insert_after": "custom_address"},
            {"fieldname": "custom_ifsc_code", "label": "IFSC Code",
             "fieldtype": "Data", "insert_after": "custom_bank_account_number"},
            {"fieldname": "custom_gst_certificate", "label": "GST Certificate",
             "fieldtype": "Attach", "insert_after": "custom_ifsc_code"},
            {"fieldname": "custom_msme_certificate", "label": "MSME/UDYAM Certificate",
             "fieldtype": "Attach", "insert_after": "custom_gst_certificate"},
        ]
    }
    create_custom_fields(fields, update=True)
    frappe.db.commit()

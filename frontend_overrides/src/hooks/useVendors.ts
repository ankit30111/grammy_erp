// Grammy ERP — useVendors hook, re-plumbed to ERPNext (Supplier doctype).
// DROP-IN REPLACEMENT for src/hooks/useVendors.ts.
// The UI (Vendors.tsx, VendorForm.tsx) is UNCHANGED — it consumes the exact
// same shape this hook returns. Only the data source moved: Supabase -> ERPNext.
//
// Mapping  (old "vendors" table  ->  ERPNext "Supplier"):
//   id                  -> name (ERPNext doc id, e.g. "V-001")
//   vendor_code         -> name (same — the code IS the id in ERPNext)
//   name                -> supplier_name
//   gst_number          -> tax_id        (GSTIN; India Compliance also syncs `gstin`)
//   is_active           -> !disabled     (soft-delete = disable, like the old flag)
//   contact_person_name -> custom_contact_person_name }
//   email               -> custom_email                } custom fields added to
//   contact_number      -> custom_contact_number        } Supplier via the grammy_erp
//   address             -> custom_address               } app (see supplier_custom_fields.json)
//   bank_account_number -> custom_bank_account_number  } permlevel 1 (admin-only, server-enforced)
//   ifsc_code           -> custom_ifsc_code            }
//   gst_certificate_url -> custom_gst_certificate (Attach)
//   msme_certificate_url-> custom_msme_certificate (Attach)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { erp } from "@/integrations/erpnext/erpnext";
import { toast } from "sonner";

const DEFAULT_SUPPLIER_GROUP = "Local";
const DEFAULT_SUPPLIER_TYPE = "Company";

// Non-sensitive columns shown in the list/detail views.
const SUPPLIER_FIELDS = [
  "name",
  "supplier_name",
  "supplier_group",
  "tax_id",
  "disabled",
  "custom_contact_person_name",
  "custom_email",
  "custom_contact_number",
  "custom_address",
];

// Map an ERPNext Supplier doc -> the vendor shape the UI expects.
function toVendor(s: any) {
  return {
    id: s.name,
    vendor_code: s.name,
    name: s.supplier_name,
    gst_number: s.tax_id || "",
    is_active: !s.disabled,
    contact_person_name: s.custom_contact_person_name || null,
    email: s.custom_email || null,
    contact_number: s.custom_contact_number || null,
    address: s.custom_address || null,
  };
}

export type VendorFinance = {
  id: string;
  bank_account_number: string | null;
  ifsc_code: string | null;
  gst_certificate_url: string | null;
  msme_certificate_url: string | null;
};

// Upload a file to ERPNext and return its file_url. Used for certificates.
async function uploadFile(file: File, docname: string, fieldname: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("is_private", "1");
  fd.append("doctype", "Supplier");
  fd.append("docname", docname);
  fd.append("fieldname", fieldname);
  // @ts-ignore — csrf injected by Frappe into the served page
  const csrf = (window.csrf_token || (window.frappe && window.frappe.csrf_token)) || "";
  const res = await fetch("/api/method/upload_file", {
    method: "POST",
    credentials: "include",
    headers: { "X-Frappe-CSRF-Token": csrf },
    body: fd,
  });
  if (!res.ok) throw new Error("File upload failed");
  const body = await res.json();
  return body.message.file_url as string;
}

/**
 * Admin-only sensitive finance fields. The custom bank/IFSC/certificate fields
 * are set to permlevel 1 in ERPNext, and only Accounts Manager / System Manager
 * have permlevel-1 read — so non-admins simply won't receive these values from
 * the server. This replaces the old column-level RPC with native field security.
 */
export const useVendorFinance = (vendorId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ["vendor-finance", vendorId],
    enabled: !!vendorId && enabled,
    queryFn: async () => {
      const s: any = await erp.getDoc("Supplier", vendorId as string);
      return {
        id: s.name,
        bank_account_number: s.custom_bank_account_number ?? null,
        ifsc_code: s.custom_ifsc_code ?? null,
        gst_certificate_url: s.custom_gst_certificate ?? null,
        msme_certificate_url: s.custom_msme_certificate ?? null,
      } as VendorFinance;
    },
  });
};

export const useVendors = () => {
  const queryClient = useQueryClient();

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const rows = await erp.getList<any>("Supplier", {
        fields: SUPPLIER_FIELDS,
        filters: [["disabled", "=", 0]],
        limit: 0,
        orderBy: "modified desc",
      });
      return rows.map(toVendor);
    },
    retry: 2,
  });

  const addVendor = useMutation({
    mutationFn: async (v: any) => {
      const created: any = await erp.createDoc("Supplier", {
        supplier_name: v.name,
        supplier_group: DEFAULT_SUPPLIER_GROUP,
        supplier_type: DEFAULT_SUPPLIER_TYPE,
        tax_id: v.gst_number || null,
        custom_contact_person_name: v.contact_person_name || null,
        custom_email: v.email || null,
        custom_contact_number: v.contact_number || null,
        custom_address: v.address || null,
        custom_bank_account_number: v.bank_account_number || null,
        custom_ifsc_code: v.ifsc_code || null,
      });
      // Attach certificates after the doc exists (need its name).
      const patch: any = {};
      if (v.gst_certificate) patch.custom_gst_certificate = await uploadFile(v.gst_certificate, created.name, "custom_gst_certificate");
      if (v.msme_certificate) patch.custom_msme_certificate = await uploadFile(v.msme_certificate, created.name, "custom_msme_certificate");
      if (Object.keys(patch).length) await erp.updateDoc("Supplier", created.name, patch);
      return created;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(`Vendor added successfully with code: ${data.name}`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to add vendor"),
  });

  const updateVendor = useMutation({
    mutationFn: async (v: any) => {
      const patch: any = {
        supplier_name: v.name,
        tax_id: v.gst_number || null,
        custom_contact_person_name: v.contact_person_name || null,
        custom_email: v.email || null,
        custom_contact_number: v.contact_number || null,
        custom_address: v.address || null,
        custom_bank_account_number: v.bank_account_number || null,
        custom_ifsc_code: v.ifsc_code || null,
      };
      if (v.gst_certificate) patch.custom_gst_certificate = await uploadFile(v.gst_certificate, v.id, "custom_gst_certificate");
      if (v.msme_certificate) patch.custom_msme_certificate = await uploadFile(v.msme_certificate, v.id, "custom_msme_certificate");
      await erp.updateDoc("Supplier", v.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully");
    },
    onError: (e: any) => toast.error(`Failed to update vendor: ${e.message || e}`),
  });

  // Soft delete = disable the Supplier (mirrors the old is_active=false).
  const deleteVendor = useMutation({
    mutationFn: async (id: string) => { await erp.updateDoc("Supplier", id, { disabled: 1 }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully");
    },
    onError: (e: any) => toast.error(`Failed to delete vendor: ${e.message || e}`),
  });

  return { vendors, isLoading, addVendor, updateVendor, deleteVendor };
};

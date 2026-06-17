// Grammy ERP — ERPNext API client
// Replaces the Supabase client. Same-origin (served from the Frappe site),
// so auth is the user's ERPNext session cookie — no tokens, no CORS.
// Drop in at: src/integrations/erpnext/erpnext.ts
//
// Usage:
//   import { erp } from "@/integrations/erpnext/erpnext";
//   const suppliers = await erp.getList("Supplier", { fields: ["name","supplier_name"], limit: 0 });
//   const doc       = await erp.getDoc("Purchase Order", "PUR-ORD-2026-0001");
//   const created   = await erp.createDoc("Supplier", { supplier_name: "X", supplier_group: "Local" });
//   await erp.submitDoc("Purchase Order", created.name);

type Dict = Record<string, any>;

export interface ListOpts {
  fields?: string[];
  filters?: Array<[string, string, any]> | Dict;
  limit?: number;        // 0 = all
  start?: number;
  orderBy?: string;      // e.g. "creation desc"
}

// Frappe injects csrf_token into the served page (window.csrf_token).
function csrf(): string {
  // @ts-ignore
  return (typeof window !== "undefined" && (window.csrf_token || (window.frappe && window.frappe.csrf_token))) || "";
}

async function request(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(path, {
    credentials: "include", // send the ERPNext session cookie
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": csrf(),
      ...(init.headers || {}),
    },
    ...init,
  });

  let body: any = null;
  try { body = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok) {
    // Surface ERPNext permission errors cleanly (the old build's weak spot)
    const msg =
      body?._server_messages ||
      body?.exception ||
      body?.message ||
      `${res.status} ${res.statusText}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg)) as any;
    err.status = res.status;
    err.isPermission = res.status === 403;
    err.body = body;
    throw err;
  }
  return body;
}

function qs(opts: ListOpts): string {
  const p = new URLSearchParams();
  if (opts.fields) p.set("fields", JSON.stringify(opts.fields));
  if (opts.filters) p.set("filters", JSON.stringify(opts.filters));
  p.set("limit_page_length", String(opts.limit ?? 20));
  if (opts.start) p.set("limit_start", String(opts.start));
  if (opts.orderBy) p.set("order_by", opts.orderBy);
  return p.toString();
}

export const erp = {
  /** List records of a doctype. */
  async getList<T = Dict>(doctype: string, opts: ListOpts = {}): Promise<T[]> {
    const r = await request(`/api/resource/${encodeURIComponent(doctype)}?${qs(opts)}`);
    return r.data as T[];
  },

  /** Count records (optionally filtered). */
  async getCount(doctype: string, filters?: ListOpts["filters"]): Promise<number> {
    const p = new URLSearchParams({ doctype });
    if (filters) p.set("filters", JSON.stringify(filters));
    const r = await request(`/api/method/frappe.client.get_count?${p.toString()}`);
    return r.message as number;
  },

  /** Fetch one full document by name. */
  async getDoc<T = Dict>(doctype: string, name: string): Promise<T> {
    const r = await request(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    return r.data as T;
  },

  /** Create a document. */
  async createDoc<T = Dict>(doctype: string, doc: Dict): Promise<T> {
    const r = await request(`/api/resource/${encodeURIComponent(doctype)}`, {
      method: "POST",
      body: JSON.stringify(doc),
    });
    return r.data as T;
  },

  /** Update fields on a document. */
  async updateDoc<T = Dict>(doctype: string, name: string, patch: Dict): Promise<T> {
    const r = await request(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return r.data as T;
  },

  /** Submit a submittable document (docstatus 0 -> 1). */
  async submitDoc(doctype: string, name: string): Promise<any> {
    return request(`/api/method/frappe.client.submit`, {
      method: "POST",
      body: JSON.stringify({ doc: JSON.stringify({ doctype, name, __islocal: 0 }) }),
    });
  },

  /** Cancel a submitted document (docstatus 1 -> 2). */
  async cancelDoc(doctype: string, name: string): Promise<any> {
    return request(`/api/method/frappe.client.cancel`, {
      method: "POST",
      body: JSON.stringify({ doctype, name }),
    });
  },

  /** Call any whitelisted server method (RPC / workflow actions / reports). */
  async call<T = any>(method: string, args: Dict = {}): Promise<T> {
    const r = await request(`/api/method/${method}`, {
      method: "POST",
      body: JSON.stringify(args),
    });
    return r.message as T;
  },

  /** Apply a workflow action (e.g. "Approve", "Reject") to a document. */
  async applyWorkflow(doctype: string, name: string, action: string): Promise<any> {
    return this.call("frappe.model.workflow.apply_workflow", {
      doc: JSON.stringify({ doctype, name }),
      action,
    });
  },

  /** Current logged-in user. */
  async whoami(): Promise<string> {
    const r = await request(`/api/method/frappe.auth.get_logged_user`);
    return r.message as string;
  },
};

export default erp;

// Grammy ERP - useRawMaterials, re-plumbed to ERPNext (Item doctype, "Raw Material" group).
// DROP-IN REPLACEMENT for src/hooks/useRawMaterials.ts. UI screens unchanged.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { erp } from "@/integrations/erpnext/erpnext";
import { toast } from "sonner";

const RAW_MATERIAL_GROUP = "Raw Material";

// Map an ERPNext Item -> the raw-material shape the UI expects.
function toMaterial(it: any) {
  return {
    id: it.name,
    material_code: it.item_code,
    name: it.item_name,
    category: it.item_group,
    specification: it.description || "",
    unit_of_measure: it.stock_uom || "",
    unit_price: undefined,
    sourcing_type: undefined,
    currency: undefined,
    cbm_per_unit: undefined,
    supplier_country: undefined,
    raw_material_vendors: [],
  };
}

export const useRawMaterials = () => {
  const queryClient = useQueryClient();

  const { data: rawMaterials = [], isLoading } = useQuery({
    queryKey: ["raw-materials"],
    queryFn: async () => {
      const rows = await erp.getList<any>("Item", {
        fields: ["name", "item_code", "item_name", "item_group", "description", "stock_uom"],
        filters: [["item_group", "=", RAW_MATERIAL_GROUP]],
        limit: 0,
        orderBy: "modified desc",
      });
      return rows.map(toMaterial);
    },
    retry: 2,
  });

  const addRawMaterial = useMutation({
    mutationFn: async (m: any) =>
      erp.createDoc("Item", {
        item_code: m.material_code,
        item_name: m.name,
        item_group: RAW_MATERIAL_GROUP,
        stock_uom: m.unit_of_measure || "Nos",
        description: m.specification || "",
        is_stock_item: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      toast.success("Raw material added successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add raw material"),
  });

  const updateRawMaterial = useMutation({
    mutationFn: async (d: any) =>
      erp.updateDoc("Item", d.id, {
        item_name: d.name,
        item_group: RAW_MATERIAL_GROUP,
        description: d.specification || "",
        stock_uom: d.unit_of_measure || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      toast.success("Raw material updated successfully");
    },
    onError: (e: any) => toast.error(`Failed to update material: ${e.message || e}`),
  });

  const deleteRawMaterial = useMutation({
    mutationFn: async (id: string) => { await erp.updateDoc("Item", id, { disabled: 1 }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      toast.success("Raw material deleted successfully");
    },
    onError: (e: any) => toast.error(`Failed to delete material: ${e.message || e}`),
  });

  return { rawMaterials, isLoading, addRawMaterial, updateRawMaterial, deleteRawMaterial };
};

export const useSpecificationHistory = (materialId: string) =>
  useQuery({ queryKey: ["spec-history", materialId], enabled: false, queryFn: async () => [] });

export const getDocumentUrl = async (fileName: string) => fileName;

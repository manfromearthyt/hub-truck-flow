import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loadSchema } from "@/lib/validation-schemas";

interface LoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const LoadDialog = ({ open, onOpenChange, onSuccess }: LoadDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    load_provider_id: "",
    loading_location: "",
    unloading_location: "",
    material_description: "",
    material_weight: "",
    freight_amount: "",
    truck_freight_amount: "",
  });

  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

  const fetchProviders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("load_providers").select("*").eq("user_id", user.id);
    setProviders(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate form data
      const validationData = {
        load_provider_id: formData.load_provider_id,
        loading_location: formData.loading_location,
        unloading_location: formData.unloading_location,
        material_description: formData.material_description,
        material_weight: parseFloat(formData.material_weight),
        freight_amount: parseFloat(formData.freight_amount),
        truck_freight_amount: formData.truck_freight_amount ? parseFloat(formData.truck_freight_amount) : null,
      };

      const result = loadSchema.safeParse(validationData);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }

      const { error } = await supabase.from("loads").insert([{
        load_provider_id: result.data.load_provider_id,
        loading_location: result.data.loading_location,
        unloading_location: result.data.unloading_location,
        material_description: result.data.material_description,
        material_weight: result.data.material_weight,
        freight_amount: result.data.freight_amount,
        truck_freight_amount: result.data.truck_freight_amount,
        user_id: user.id,
      }]);
      if (error) throw error;
      toast.success("Load created successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.code === '23514' ? 'Invalid data provided' : error.message;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Load</DialogTitle>
          <DialogDescription>Enter load details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Provider *</Label>
              <Select value={formData.load_provider_id} onValueChange={(v) => setFormData({ ...formData, load_provider_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>{providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Loading Location *</Label><Input value={formData.loading_location} onChange={(e) => setFormData({ ...formData, loading_location: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Unloading Location *</Label><Input value={formData.unloading_location} onChange={(e) => setFormData({ ...formData, unloading_location: e.target.value })} required /></div>
            <div className="space-y-2 md:col-span-2"><Label>Material Description *</Label><Textarea value={formData.material_description} onChange={(e) => setFormData({ ...formData, material_description: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Weight (tons) *</Label><Input type="number" step="0.01" value={formData.material_weight} onChange={(e) => setFormData({ ...formData, material_weight: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label htmlFor="freight_amount">Provider Freight Amount (₹) *</Label>
              <Input
                id="freight_amount"
                type="number"
                step="0.01"
                value={formData.freight_amount}
                onChange={(e) => setFormData({ ...formData, freight_amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truck_freight_amount">Truck Driver Freight (₹)</Label>
              <Input
                id="truck_freight_amount"
                type="number"
                step="0.01"
                value={formData.truck_freight_amount}
                onChange={(e) => setFormData({ ...formData, truck_freight_amount: e.target.value })}
                placeholder="Optional - for profit calculation"
              />
            </div>
          </div>
          
          {formData.freight_amount && formData.truck_freight_amount && (
            <div className="bg-success/10 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-success font-semibold">Expected Profit</Label>
                <p className="text-2xl font-bold text-success">
                  ₹{(parseFloat(formData.freight_amount || "0") - parseFloat(formData.truck_freight_amount || "0")).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Load</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

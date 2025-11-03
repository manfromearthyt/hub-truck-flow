import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Truck } from "@/pages/Trucks";
import { truckSchema } from "@/lib/validation-schemas";

interface TruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck: Truck | null;
  onSuccess: () => void;
}

export const TruckDialog = ({
  open,
  onOpenChange,
  truck,
  onSuccess,
}: TruckDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    truck_number: "",
    driver_name: "",
    driver_phone: "",
    owner_name: "",
    owner_phone: "",
    contact_person: "",
    contact_person_phone: "",
    truck_type: "open" as "open" | "container",
    truck_length: "",
    carrying_capacity: "",
  });

  useEffect(() => {
    if (truck) {
      setFormData({
        truck_number: truck.truck_number,
        driver_name: truck.driver_name,
        driver_phone: truck.driver_phone,
        owner_name: truck.owner_name,
        owner_phone: truck.owner_phone,
        contact_person: truck.contact_person || "",
        contact_person_phone: truck.contact_person_phone || "",
        truck_type: truck.truck_type,
        truck_length: truck.truck_length.toString(),
        carrying_capacity: truck.carrying_capacity.toString(),
      });
    } else {
      setFormData({
        truck_number: "",
        driver_name: "",
        driver_phone: "",
        owner_name: "",
        owner_phone: "",
        contact_person: "",
        contact_person_phone: "",
        truck_type: "open",
        truck_length: "",
        carrying_capacity: "",
      });
    }
  }, [truck, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate form data
      const validationData = {
        truck_number: formData.truck_number,
        truck_type: formData.truck_type,
        driver_name: formData.driver_name,
        driver_phone: formData.driver_phone,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        contact_person: formData.contact_person || null,
        contact_person_phone: formData.contact_person_phone || null,
        truck_length: parseFloat(formData.truck_length),
        carrying_capacity: parseFloat(formData.carrying_capacity),
      };

      const result = truckSchema.safeParse(validationData);
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }

      const data = {
        truck_number: result.data.truck_number,
        truck_type: result.data.truck_type,
        driver_name: result.data.driver_name,
        driver_phone: result.data.driver_phone,
        owner_name: result.data.owner_name,
        owner_phone: result.data.owner_phone,
        contact_person: result.data.contact_person,
        contact_person_phone: result.data.contact_person_phone,
        truck_length: result.data.truck_length,
        carrying_capacity: result.data.carrying_capacity,
        user_id: user.id,
      };

      if (truck) {
        const { error } = await supabase
          .from("trucks")
          .update(data)
          .eq("id", truck.id);
        if (error) throw error;
        toast.success("Truck updated successfully");
      } else {
        const { error } = await supabase.from("trucks").insert([data]);
        if (error) throw error;
        toast.success("Truck added successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.code === '23514' ? 'Invalid truck data' : error.message || "Error saving truck";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{truck ? "Edit Truck" : "Add New Truck"}</DialogTitle>
          <DialogDescription>
            Enter the truck details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="truck_number">Truck Number *</Label>
              <Input
                id="truck_number"
                value={formData.truck_number}
                onChange={(e) =>
                  setFormData({ ...formData, truck_number: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truck_type">Truck Type *</Label>
              <Select
                value={formData.truck_type}
                onValueChange={(value: "open" | "container") =>
                  setFormData({ ...formData, truck_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_name">Driver Name *</Label>
              <Input
                id="driver_name"
                value={formData.driver_name}
                onChange={(e) =>
                  setFormData({ ...formData, driver_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_phone">Driver Phone *</Label>
              <Input
                id="driver_phone"
                type="tel"
                value={formData.driver_phone}
                onChange={(e) =>
                  setFormData({ ...formData, driver_phone: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name *</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) =>
                  setFormData({ ...formData, owner_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_phone">Owner Phone *</Label>
              <Input
                id="owner_phone"
                type="tel"
                value={formData.owner_phone}
                onChange={(e) =>
                  setFormData({ ...formData, owner_phone: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person (3rd Party)</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="Person responsible for truck"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person_phone">Contact Person Phone</Label>
              <Input
                id="contact_person_phone"
                type="tel"
                value={formData.contact_person_phone}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person_phone: e.target.value })
                }
                placeholder="Contact person mobile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="truck_length">Truck Length (ft) *</Label>
              <Input
                id="truck_length"
                type="number"
                step="0.01"
                value={formData.truck_length}
                onChange={(e) =>
                  setFormData({ ...formData, truck_length: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrying_capacity">Carrying Capacity (tons) *</Label>
              <Input
                id="carrying_capacity"
                type="number"
                step="0.01"
                value={formData.carrying_capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    carrying_capacity: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {truck ? "Update" : "Add"} Truck
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

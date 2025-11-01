import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { TruckDialog } from "@/components/trucks/TruckDialog";
import { TruckList } from "@/components/trucks/TruckList";
import { toast } from "sonner";

export interface Truck {
  id: string;
  truck_number: string;
  driver_name: string;
  driver_phone: string;
  owner_name: string;
  owner_phone: string;
  contact_person: string | null;
  contact_person_phone: string | null;
  truck_type: "open" | "container";
  truck_length: number;
  carrying_capacity: number;
  created_at: string;
  is_active: boolean;
}

const Trucks = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);

  const fetchTrucks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trucks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrucks(data || []);
    } catch (error: any) {
      toast.error("Error loading trucks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();

    const channel = supabase
      .channel("trucks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, fetchTrucks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("trucks").delete().eq("id", id);
      if (error) throw error;
      toast.success("Truck deleted successfully");
    } catch (error: any) {
      toast.error("Error deleting truck: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trucks</h1>
          <p className="text-muted-foreground">Manage your truck fleet</p>
        </div>
        <Button
          onClick={() => {
            setEditingTruck(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Truck
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Truck Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <TruckList
            trucks={trucks}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <TruckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        truck={editingTruck}
        onSuccess={fetchTrucks}
      />
    </div>
  );
};

export default Trucks;

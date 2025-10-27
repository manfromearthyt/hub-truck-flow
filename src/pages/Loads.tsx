import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { LoadDialog } from "@/components/loads/LoadDialog";
import { LoadList } from "@/components/loads/LoadList";
import { toast } from "sonner";

export interface Load {
  id: string;
  load_provider_id: string;
  truck_id: string | null;
  loading_location: string;
  unloading_location: string;
  material_description: string;
  material_weight: number;
  freight_amount: number;
  status: "pending" | "assigned" | "in_transit" | "delivered" | "completed";
  assigned_at: string | null;
  loading_completed_at: string | null;
  delivery_completed_at: string | null;
  created_at: string;
  load_providers: { company_name: string } | null;
  trucks: { truck_number: string } | null;
}

const Loads = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchLoads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("loads")
        .select(`
          *,
          load_providers(company_name),
          trucks(truck_number)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLoads(data || []);
    } catch (error: any) {
      toast.error("Error loading loads: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();

    const channel = supabase
      .channel("loads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, fetchLoads)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Loads</h1>
          <p className="text-muted-foreground">Manage freight loads and assignments</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Load
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Loads</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadList loads={loads} loading={loading} onUpdate={fetchLoads} />
        </CardContent>
      </Card>

      <LoadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchLoads}
      />
    </div>
  );
};

export default Loads;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { LoadProviderDialog } from "@/components/load-providers/LoadProviderDialog";
import { LoadProviderList } from "@/components/load-providers/LoadProviderList";
import { toast } from "sonner";

export interface LoadProvider {
  id: string;
  company_name: string;
  contact_person: string;
  contact_phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

const LoadProviders = () => {
  const [loadProviders, setLoadProviders] = useState<LoadProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LoadProvider | null>(null);

  const fetchLoadProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("load_providers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLoadProviders(data || []);
    } catch (error: any) {
      toast.error("Error loading load providers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadProviders();

    const channel = supabase
      .channel("load-providers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "load_providers" }, fetchLoadProviders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (provider: LoadProvider) => {
    setEditingProvider(provider);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("load_providers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Load provider deleted successfully");
    } catch (error: any) {
      toast.error("Error deleting load provider: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Load Providers</h1>
          <p className="text-muted-foreground">Manage your freight clients</p>
        </div>
        <Button
          onClick={() => {
            setEditingProvider(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadProviderList
            providers={loadProviders}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <LoadProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        provider={editingProvider}
        onSuccess={fetchLoadProviders}
      />
    </div>
  );
};

export default LoadProviders;

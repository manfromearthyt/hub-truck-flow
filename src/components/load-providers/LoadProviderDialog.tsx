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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoadProvider } from "@/pages/LoadProviders";

interface LoadProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: LoadProvider | null;
  onSuccess: () => void;
}

export const LoadProviderDialog = ({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: LoadProviderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    contact_phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        company_name: provider.company_name,
        contact_person: provider.contact_person,
        contact_phone: provider.contact_phone,
        email: provider.email || "",
        address: provider.address || "",
      });
    } else {
      setFormData({
        company_name: "",
        contact_person: "",
        contact_phone: "",
        email: "",
        address: "",
      });
    }
  }, [provider, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const data = {
        ...formData,
        user_id: user.id,
        email: formData.email || null,
        address: formData.address || null,
      };

      if (provider) {
        const { error } = await supabase
          .from("load_providers")
          .update(data)
          .eq("id", provider.id);
        if (error) throw error;
        toast.success("Provider updated successfully");
      } else {
        const { error } = await supabase.from("load_providers").insert(data);
        if (error) throw error;
        toast.success("Provider added successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error saving provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {provider ? "Edit Load Provider" : "Add New Load Provider"}
          </DialogTitle>
          <DialogDescription>
            Enter the provider details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person *</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone *</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
            />
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
              {provider ? "Update" : "Add"} Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Load } from "@/pages/Loads";

interface LoadDetailsDialogProps {
  load: Load | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const LoadDetailsDialog = ({ load, onOpenChange, onUpdate }: LoadDetailsDialogProps) => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState("");
  const [status, setStatus] = useState("");
  const [txnData, setTxnData] = useState({ amount: "", method: "upi" as any, details: "" });

  useEffect(() => {
    if (load) {
      setSelectedTruck(load.truck_id || "");
      setStatus(load.status);
      fetchTrucks();
    }
  }, [load]);

  const fetchTrucks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trucks").select("*").eq("user_id", user.id);
    setTrucks(data || []);
  };

  const handleAssignTruck = async () => {
    if (!load || !selectedTruck) return;
    try {
      const { error } = await supabase.from("loads").update({ truck_id: selectedTruck, status: "assigned", assigned_at: new Date().toISOString() }).eq("id", load.id);
      if (error) throw error;
      toast.success("Truck assigned");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!load) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "in_transit") updates.loading_completed_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivery_completed_at = new Date().toISOString();
      const { error } = await supabase.from("loads").update(updates).eq("id", load.id);
      if (error) throw error;
      toast.success("Status updated");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleTransaction = async (type: "advance" | "balance") => {
    if (!load || !txnData.amount) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("transactions").insert({ user_id: user.id, load_id: load.id, transaction_type: type, amount: parseFloat(txnData.amount), payment_method: txnData.method, payment_details: txnData.details });
      if (error) throw error;
      if (type === "balance") await supabase.from("loads").update({ status: "completed" }).eq("id", load.id);
      toast.success(`${type} payment recorded`);
      setTxnData({ amount: "", method: "upi", details: "" });
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!load) return null;

  return (
    <Dialog open={!!load} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Load Details</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Provider</Label><p className="font-medium">{load.load_providers?.company_name}</p></div>
            <div><Label>Status</Label><Badge>{load.status}</Badge></div>
            <div><Label>From</Label><p>{load.loading_location}</p></div>
            <div><Label>To</Label><p>{load.unloading_location}</p></div>
            <div><Label>Material</Label><p>{load.material_description} ({load.material_weight} tons)</p></div>
            <div><Label>Freight</Label><p className="font-bold">₹{Number(load.freight_amount).toLocaleString("en-IN")}</p></div>
          </div>
          <Separator />
          {load.status === "pending" && (<div className="space-y-4"><Label>Assign Truck</Label><div className="flex gap-2"><Select value={selectedTruck} onValueChange={setSelectedTruck}><SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger><SelectContent>{trucks.map((t) => <SelectItem key={t.id} value={t.id}>{t.truck_number} - {t.driver_name}</SelectItem>)}</SelectContent></Select><Button onClick={handleAssignTruck}>Assign</Button></div></div>)}
          {load.status === "assigned" && <Button onClick={() => handleStatusUpdate("in_transit")}>Mark Loading Complete</Button>}
          {load.status === "in_transit" && <Button onClick={() => handleStatusUpdate("delivered")}>Mark Delivered</Button>}
          {(load.status === "assigned" || load.status === "in_transit") && (<div className="space-y-4"><Separator /><h3 className="font-semibold">Record Advance Payment</h3><div className="grid gap-4 md:grid-cols-3"><div><Label>Amount</Label><Input type="number" value={txnData.amount} onChange={(e) => setTxnData({...txnData, amount: e.target.value})} /></div><div><Label>Method</Label><Select value={txnData.method} onValueChange={(v) => setTxnData({...txnData, method: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent></Select></div><div><Label>Details</Label><Input value={txnData.details} onChange={(e) => setTxnData({...txnData, details: e.target.value})} placeholder="UPI ID / Account" /></div></div><Button onClick={() => handleTransaction("advance")}>Record Advance</Button></div>)}
          {load.status === "delivered" && (<div className="space-y-4"><Separator /><h3 className="font-semibold">Record Balance Payment</h3><div className="grid gap-4 md:grid-cols-3"><div><Label>Amount</Label><Input type="number" value={txnData.amount} onChange={(e) => setTxnData({...txnData, amount: e.target.value})} /></div><div><Label>Method</Label><Select value={txnData.method} onValueChange={(v) => setTxnData({...txnData, method: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank">Bank</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent></Select></div><div><Label>Details</Label><Input value={txnData.details} onChange={(e) => setTxnData({...txnData, details: e.target.value})} placeholder="UPI ID / Account" /></div></div><Button onClick={() => handleTransaction("balance")}>Complete & Pay Balance</Button></div>)}
        </div>
      </DialogContent>
    </Dialog>
  );
};

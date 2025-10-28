import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LoadTransactionTimeline } from "./LoadTransactionTimeline";
import { Separator } from "@/components/ui/separator";

interface LoadDetailsDialogProps {
  load: any;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const LoadDetailsDialog = ({ load, onOpenChange, onUpdate }: LoadDetailsDialogProps) => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // For receiving payment from load provider
  const [receiveData, setReceiveData] = useState({ 
    amount: "", 
    method: "upi" as any, 
    details: "", 
    notes: "" 
  });
  
  // For paying to driver
  const [payData, setPayData] = useState({ 
    amount: "", 
    method: "upi" as any, 
    details: "", 
    notes: "" 
  });

  useEffect(() => {
    if (load) {
      setSelectedTruck(load.truck_id || "");
      fetchTrucks();
      fetchTransactions();
    }
  }, [load]);

  const fetchTrucks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trucks").select("*").eq("user_id", user.id);
    setTrucks(data || []);
  };

  const fetchTransactions = async () => {
    if (!load) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("load_id", load.id)
      .order("transaction_date", { ascending: true });
    setTransactions(data || []);
  };

  const handleAssignTruck = async () => {
    if (!load || !selectedTruck) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("loads")
        .update({ 
          truck_id: selectedTruck, 
          status: "assigned", 
          assigned_at: new Date().toISOString() 
        })
        .eq("id", load.id);
      if (error) throw error;
      toast.success("Truck assigned successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!load) return;
    setLoading(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "in_transit") updates.loading_completed_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivery_completed_at = new Date().toISOString();
      const { error } = await supabase.from("loads").update(updates).eq("id", load.id);
      if (error) throw error;
      toast.success("Status updated successfully");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePayment = async (type: "advance" | "balance") => {
    if (!load || !receiveData.amount) {
      toast.error("Please enter amount");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        load_id: load.id,
        transaction_type: type,
        payment_direction: "received",
        amount: parseFloat(receiveData.amount),
        payment_method: receiveData.method,
        payment_details: receiveData.details,
        notes: receiveData.notes,
        party_name: load.load_providers?.company_name,
      });
      
      if (error) throw error;
      toast.success(`${type === "advance" ? "Advance" : "Balance"} received from load provider`);
      setReceiveData({ amount: "", method: "upi", details: "", notes: "" });
      fetchTransactions();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayDriver = async (type: "advance" | "balance") => {
    if (!load || !payData.amount) {
      toast.error("Please enter amount");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get truck details for driver name
      const truck = trucks.find(t => t.id === load.truck_id);
      
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        load_id: load.id,
        transaction_type: type,
        payment_direction: "paid",
        amount: parseFloat(payData.amount),
        payment_method: payData.method,
        payment_details: payData.details,
        notes: payData.notes,
        party_name: truck?.driver_name || "Driver",
      });
      
      if (error) throw error;
      
      // If balance payment is done, mark load as completed
      if (type === "balance") {
        await supabase.from("loads").update({ status: "completed" }).eq("id", load.id);
      }
      
      toast.success(`${type === "advance" ? "Advance" : "Balance"} paid to driver`);
      setPayData({ amount: "", method: "upi", details: "", notes: "" });
      fetchTransactions();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!load) return null;

  const truck = trucks.find(t => t.id === load.truck_id);
  const totalReceived = transactions.filter(t => t.payment_direction === "received").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPaid = transactions.filter(t => t.payment_direction === "paid").reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Dialog open={!!load} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Details & Transactions</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Load Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Provider</Label>
              <p className="font-medium">{load.load_providers?.company_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div><Badge variant={load.status === "completed" ? "default" : "secondary"}>{load.status}</Badge></div>
            </div>
            <div>
              <Label className="text-muted-foreground">Freight Amount</Label>
              <p className="text-2xl font-bold text-primary">₹{Number(load.freight_amount).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">From</Label>
              <p>{load.loading_location}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">To</Label>
              <p>{load.unloading_location}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Material</Label>
              <p>{load.material_description} ({load.material_weight} tons)</p>
            </div>
          </div>

          {truck && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <Label className="text-muted-foreground">Assigned Truck</Label>
              <p className="font-medium">{truck.truck_number} - {truck.driver_name}</p>
              <p className="text-sm text-muted-foreground">{truck.driver_phone}</p>
              {truck.contact_person && (
                <p className="text-sm text-muted-foreground mt-1">
                  Contact: {truck.contact_person} ({truck.contact_person_phone})
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Assign Truck */}
          {load.status === "pending" && (
            <div className="space-y-4">
              <Label>Assign Truck</Label>
              <div className="flex gap-2">
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select truck" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.truck_number} - {t.driver_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAssignTruck} disabled={loading || !selectedTruck}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Status Updates */}
          {load.status === "assigned" && (
            <Button onClick={() => handleStatusUpdate("in_transit")} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Loading Complete (In Transit)
            </Button>
          )}
          
          {load.status === "in_transit" && (
            <Button onClick={() => handleStatusUpdate("delivered")} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Delivered
            </Button>
          )}

          {/* Transaction Section - Only show after truck assignment */}
          {load.status !== "pending" && load.status !== "completed" && (
            <>
              <Separator />
              
              {/* Payment Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-success/5 border-success/20">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-success" />
                    Total Received
                  </Label>
                  <p className="text-2xl font-bold text-success">₹{totalReceived.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-destructive" />
                    Total Paid
                  </Label>
                  <p className="text-2xl font-bold text-destructive">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <Label className="text-muted-foreground">Balance</Label>
                  <p className="text-2xl font-bold">₹{(totalReceived - totalPaid).toLocaleString()}</p>
                </div>
              </div>

              {/* Receive Payment from Load Provider */}
              <div className="space-y-4 p-4 rounded-lg border bg-success/5 border-success/20">
                <h3 className="font-semibold flex items-center gap-2">
                  <ArrowDown className="h-5 w-5 text-success" />
                  Receive Payment from Load Provider
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={receiveData.amount}
                      onChange={(e) => setReceiveData({...receiveData, amount: e.target.value})}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Payment Method *</Label>
                    <Select value={receiveData.method} onValueChange={(v) => setReceiveData({...receiveData, method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Details</Label>
                    <Input
                      value={receiveData.details}
                      onChange={(e) => setReceiveData({...receiveData, details: e.target.value})}
                      placeholder="UPI ID / Txn ID / Check no."
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={receiveData.notes}
                      onChange={(e) => setReceiveData({...receiveData, notes: e.target.value})}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleReceivePayment("advance")} disabled={loading} variant="outline" className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Receive Advance
                  </Button>
                  <Button onClick={() => handleReceivePayment("balance")} disabled={loading || load.status !== "delivered"} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Receive Balance
                  </Button>
                </div>
              </div>

              {/* Pay to Driver */}
              <div className="space-y-4 p-4 rounded-lg border bg-destructive/5 border-destructive/20">
                <h3 className="font-semibold flex items-center gap-2">
                  <ArrowUp className="h-5 w-5 text-destructive" />
                  Pay to Driver
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={payData.amount}
                      onChange={(e) => setPayData({...payData, amount: e.target.value})}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Payment Method *</Label>
                    <Select value={payData.method} onValueChange={(v) => setPayData({...payData, method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Details</Label>
                    <Input
                      value={payData.details}
                      onChange={(e) => setPayData({...payData, details: e.target.value})}
                      placeholder="UPI ID / Txn ID / Check no."
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={payData.notes}
                      onChange={(e) => setPayData({...payData, notes: e.target.value})}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handlePayDriver("advance")} disabled={loading} variant="outline" className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pay Advance
                  </Button>
                  <Button onClick={() => handlePayDriver("balance")} disabled={loading || load.status !== "delivered"} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pay Balance & Complete
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Transaction Timeline */}
          {transactions.length > 0 && (
            <>
              <Separator />
              <LoadTransactionTimeline transactions={transactions} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

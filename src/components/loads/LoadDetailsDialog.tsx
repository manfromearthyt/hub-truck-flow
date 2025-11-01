import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LoadTransactionTimeline } from "./LoadTransactionTimeline";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

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
  
  const [receiveData, setReceiveData] = useState({ amount: "", method: "cash" as any, details: "", notes: "" });
  const [payData, setPayData] = useState({ amount: "", method: "cash" as any, details: "", notes: "" });

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
    const { data } = await supabase.from("trucks").select("*").eq("user_id", user.id).eq("is_active", true);
    setTrucks(data || []);
  };

  const fetchTransactions = async () => {
    if (!load) return;
    const { data } = await supabase.from("transactions").select("*").eq("load_id", load.id).order("transaction_date", { ascending: true });
    setTransactions(data || []);
  };

  const handleAssignTruck = async () => {
    if (!load || !selectedTruck) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("loads").update({ truck_id: selectedTruck, status: "assigned", assigned_at: new Date().toISOString() }).eq("id", load.id);
      if (error) throw error;
      toast.success("Truck assigned successfully");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to assign truck");
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
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (direction: 'received' | 'paid') => {
    const data = direction === 'received' ? receiveData : payData;
    
    if (!data.amount || parseFloat(data.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const providerFreight = load.freight_amount || 0;
    const truckFreight = load.truck_freight_amount || 0;
    const totalReceived = transactions.filter(t => t.payment_direction === 'received').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalPaid = transactions.filter(t => t.payment_direction === 'paid').reduce((sum, t) => sum + Number(t.amount), 0);

    // Validation
    if (direction === 'received') {
      if (totalReceived + parseFloat(data.amount) > providerFreight) {
        toast.error(`Payment exceeds freight amount. Balance due: ₹${(providerFreight - totalReceived).toLocaleString('en-IN')}`);
        return;
      }
    } else {
      if (!truckFreight) {
        toast.error("Please set truck freight amount first");
        return;
      }
      if (totalPaid + parseFloat(data.amount) > truckFreight) {
        toast.error(`Payment exceeds truck freight. Balance to pay: ₹${(truckFreight - totalPaid).toLocaleString('en-IN')}`);
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existingPayments = transactions.filter(t => t.payment_direction === direction);
      const sequence = existingPayments.length + 1;
      const truck = trucks.find(t => t.id === load.truck_id);

      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        load_id: load.id,
        transaction_type: sequence === 1 ? "advance" : "balance",
        payment_direction: direction,
        payment_sequence: sequence,
        amount: parseFloat(data.amount),
        payment_method: data.method,
        payment_details: data.details,
        notes: data.notes,
        party_name: direction === 'received' ? load.load_providers?.company_name : truck?.driver_name || "Driver",
      });

      if (error) throw error;

      // Check if load should be auto-completed
      const newTotalReceived = direction === 'received' ? totalReceived + parseFloat(data.amount) : totalReceived;
      const newTotalPaid = direction === 'paid' ? totalPaid + parseFloat(data.amount) : totalPaid;

      if (newTotalReceived >= providerFreight && newTotalPaid >= truckFreight) {
        await supabase.from("loads").update({ status: "completed" }).eq("id", load.id);
        toast.success("🎉 Load completed! All payments settled. Truck is now available.");
      } else {
        toast.success(`Payment recorded: ₹${parseFloat(data.amount).toLocaleString('en-IN')}`);
      }

      if (direction === 'received') {
        setReceiveData({ amount: "", method: "cash", details: "", notes: "" });
      } else {
        setPayData({ amount: "", method: "cash", details: "", notes: "" });
      }

      fetchTransactions();
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (!load) return null;

  const truck = trucks.find(t => t.id === load.truck_id);
  const providerFreight = load.freight_amount || 0;
  const truckFreight = load.truck_freight_amount || 0;
  const totalReceived = transactions.filter(t => t.payment_direction === 'received').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPaid = transactions.filter(t => t.payment_direction === 'paid').reduce((sum, t) => sum + Number(t.amount), 0);
  const balanceToReceive = providerFreight - totalReceived;
  const balanceToPay = truckFreight - totalPaid;
  const currentProfit = totalReceived - totalPaid;
  const expectedProfit = providerFreight - truckFreight;

  return (
    <Dialog open={!!load} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Management & Katha</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Load Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label className="text-muted-foreground">Provider</Label><p className="font-medium">{load.load_providers?.company_name}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><div><Badge variant={load.status === "completed" ? "default" : "secondary"}>{load.status}</Badge></div></div>
            <div><Label className="text-muted-foreground">Provider Freight</Label><p className="text-2xl font-bold text-primary">₹{providerFreight.toLocaleString('en-IN')}</p></div>
            <div><Label className="text-muted-foreground">From</Label><p>{load.loading_location}</p></div>
            <div><Label className="text-muted-foreground">To</Label><p>{load.unloading_location}</p></div>
            <div><Label className="text-muted-foreground">Material</Label><p>{load.material_description} ({load.material_weight} tons)</p></div>
          </div>

          {truckFreight > 0 && (
            <div className="bg-gradient-to-r from-success/10 to-success/5 p-4 rounded-lg border border-success/20">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-success font-semibold">Profit Tracking</Label>
                <p className="text-xl font-bold text-success">Expected: ₹{expectedProfit.toLocaleString('en-IN')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-sm"><span className="text-muted-foreground">Current Profit:</span> <span className="font-bold text-success">₹{currentProfit.toLocaleString('en-IN')}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Profit Margin:</span> <span className="font-bold">{((expectedProfit / providerFreight) * 100).toFixed(1)}%</span></div>
              </div>
              <Progress value={(currentProfit / expectedProfit) * 100} className="mt-2" />
            </div>
          )}

          {truck && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <Label className="text-muted-foreground">Assigned Truck</Label>
              <p className="font-medium">{truck.truck_number} - {truck.driver_name}</p>
              <p className="text-sm text-muted-foreground">{truck.driver_phone}</p>
              {truck.contact_person && <p className="text-sm text-muted-foreground mt-1">Contact: {truck.contact_person} ({truck.contact_person_phone})</p>}
            </div>
          )}

          {!load.truck_id && (
            <div className="space-y-2">
              <Label>Assign Truck</Label>
              <div className="flex gap-2">
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select available truck" /></SelectTrigger>
                  <SelectContent>{trucks.map((t) => (<SelectItem key={t.id} value={t.id}>{t.truck_number} - {t.driver_name}</SelectItem>))}</SelectContent>
                </Select>
                <Button onClick={handleAssignTruck} disabled={!selectedTruck || loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign</Button>
              </div>
            </div>
          )}

          {load.status !== "completed" && load.truck_id && (
            <div className="flex gap-2 flex-wrap">
              {load.status === "pending" && <Button onClick={() => handleStatusUpdate("assigned")} variant="outline" size="sm">Mark Assigned</Button>}
              {load.status === "assigned" && <Button onClick={() => handleStatusUpdate("in_transit")} size="sm">Mark In Transit</Button>}
              {load.status === "in_transit" && <Button onClick={() => handleStatusUpdate("delivered")} size="sm">Mark Delivered</Button>}
            </div>
          )}

          <Separator />

          {/* Financial Tracking */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Receive from Load Provider */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Receive from Provider</h3>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Provider Freight</p>
                  <p className="text-lg font-bold">₹{providerFreight.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Received</p><p className="text-lg font-bold text-green-600">₹{totalReceived.toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Balance Due</p><p className="text-lg font-bold text-orange-600">₹{balanceToReceive.toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{totalReceived >= providerFreight ? <Badge className="bg-green-600">Paid</Badge> : <Badge variant="secondary">Pending</Badge>}</div>
              </div>

              {balanceToReceive > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" placeholder="Amount (₹)" value={receiveData.amount} onChange={(e) => setReceiveData({...receiveData, amount: e.target.value})} />
                    <Select value={receiveData.method} onValueChange={(v) => setReceiveData({...receiveData, method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {receiveData.method === "upi" && <Input placeholder="UPI ID (e.g., name@bank)" value={receiveData.details} onChange={(e) => setReceiveData({...receiveData, details: e.target.value})} />}
                  {receiveData.method === "bank_transfer" && <Input placeholder="Bank details / Transaction ID" value={receiveData.details} onChange={(e) => setReceiveData({...receiveData, details: e.target.value})} />}
                  <Textarea placeholder="Payment notes (optional)" value={receiveData.notes} onChange={(e) => setReceiveData({...receiveData, notes: e.target.value})} rows={2} />
                  <Button onClick={() => handleRecordPayment('received')} className="w-full" disabled={!receiveData.amount || loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ArrowDown className="mr-2 h-4 w-4" />Record Payment (₹{receiveData.amount || "0"})
                  </Button>
                </div>
              )}
            </div>

            {/* Pay to Driver */}
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Pay to Driver</h3>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Driver Freight</p>
                  <p className="text-lg font-bold">₹{truckFreight.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-bold text-red-600">₹{totalPaid.toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Balance to Pay</p><p className="text-lg font-bold text-orange-600">₹{balanceToPay.toLocaleString('en-IN')}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p>{totalPaid >= truckFreight ? <Badge className="bg-green-600">Paid</Badge> : <Badge variant="secondary">Pending</Badge>}</div>
              </div>

              {truckFreight > 0 && balanceToPay > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" step="0.01" placeholder="Amount (₹)" value={payData.amount} onChange={(e) => setPayData({...payData, amount: e.target.value})} />
                    <Select value={payData.method} onValueChange={(v) => setPayData({...payData, method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {payData.method === "upi" && <Input placeholder="UPI ID (e.g., name@bank)" value={payData.details} onChange={(e) => setPayData({...payData, details: e.target.value})} />}
                  {payData.method === "bank_transfer" && <Input placeholder="Bank details / Transaction ID" value={payData.details} onChange={(e) => setPayData({...payData, details: e.target.value})} />}
                  <Textarea placeholder="Payment notes (optional)" value={payData.notes} onChange={(e) => setPayData({...payData, notes: e.target.value})} rows={2} />
                  <Button onClick={() => handleRecordPayment('paid')} className="w-full" variant="destructive" disabled={!payData.amount || loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ArrowUp className="mr-2 h-4 w-4" />Record Payment (₹{payData.amount || "0"})
                  </Button>
                </div>
              )}

              {!truckFreight && <p className="text-sm text-muted-foreground italic">Set truck freight amount when creating load to track driver payments</p>}
            </div>
          </div>

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
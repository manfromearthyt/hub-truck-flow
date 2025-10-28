import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  payment_direction: string;
  payment_method: string;
  party_name: string | null;
  transaction_date: string;
  payment_details: string | null;
  notes: string | null;
  load_id: string;
  loads: {
    loading_location: string;
    unloading_location: string;
  } | null;
}

const CashLedger = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cashInHand, setCashInHand] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          loads(loading_location, unloading_location)
        `)
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      
      setTransactions(data || []);
      
      // Calculate cash in hand
      const received = data?.filter(t => t.payment_direction === "received")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const paid = data?.filter(t => t.payment_direction === "paid")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      setTotalReceived(received);
      setTotalPaid(paid);
      setCashInHand(received - paid);
    } catch (error: any) {
      toast.error("Error loading transactions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel("transactions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchTransactions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cash Ledger</h1>
        <p className="text-muted-foreground">Track all payments and cash flow</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{cashInHand.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              +₹{totalReceived.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From load providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -₹{totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To drivers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => {
                const isReceived = txn.payment_direction === "received";
                return (
                  <div
                    key={txn.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isReceived
                        ? "bg-success/5 border-success/20"
                        : "bg-destructive/5 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          isReceived ? "bg-success/10" : "bg-destructive/10"
                        }`}
                      >
                        {isReceived ? (
                          <ArrowDownCircle className="h-5 w-5 text-success" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {isReceived ? "Received" : "Paid"} - {txn.transaction_type === "advance" ? "Advance" : "Balance"}
                        </div>
                        {txn.party_name && (
                          <div className="text-sm text-muted-foreground">
                            {isReceived ? "From" : "To"}: {txn.party_name}
                          </div>
                        )}
                        {txn.loads && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {txn.loads.loading_location} → {txn.loads.unloading_location}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(txn.transaction_date), "dd MMM yyyy, hh:mm a")} • {txn.payment_method.replace("_", " ")}
                        </div>
                        {txn.payment_details && (
                          <div className="text-xs bg-background/50 rounded p-2 mt-2 max-w-md">
                            {txn.payment_details}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        isReceived ? "text-success" : "text-destructive"
                      }`}
                    >
                      {isReceived ? "+" : "-"}₹{Number(txn.amount).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashLedger;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { LoadKathaCard } from "@/components/loads/LoadKathaCard";

const CashLedger = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("ledger-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [txnResponse, loadsResponse] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("transaction_date", { ascending: false }),
        supabase.from("loads").select("*, load_providers(*), trucks(*)").eq("user_id", user.id).order("created_at", { ascending: false })
      ]);

      if (txnResponse.error) throw txnResponse.error;
      if (loadsResponse.error) throw loadsResponse.error;

      setTransactions(txnResponse.data || []);
      setLoads(loadsResponse.data || []);
    } catch (error: any) {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const totalReceived = transactions.filter(t => t.payment_direction === 'received').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPaid = transactions.filter(t => t.payment_direction === 'paid').reduce((sum, t) => sum + Number(t.amount), 0);
  const cashInHand = totalReceived - totalPaid;

  const totalExpectedProfit = loads.reduce((sum, load) => sum + (load.profit_amount || 0), 0);
  const totalRealizedProfit = loads.filter(l => l.status === 'completed').reduce((sum, load) => sum + (load.profit_amount || 0), 0);

  const transactionsByLoad = transactions.reduce((acc, txn) => {
    if (!acc[txn.load_id]) acc[txn.load_id] = [];
    acc[txn.load_id].push(txn);
    return acc;
  }, {} as Record<string, any[]>);

  const activeLoads = loads.filter(l => l.status !== 'completed');
  const completedLoads = loads.filter(l => l.status === 'completed');

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cash Ledger & Katha</h1>
        <p className="text-muted-foreground">Track all payments and profits</p>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="active">Active Loads</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="profit">Profit Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                <ArrowDown className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalReceived.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t => t.payment_direction === 'received').length} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <ArrowUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{totalPaid.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t => t.payment_direction === 'paid').length} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${cashInHand >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  ₹{cashInHand.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">₹{totalRealizedProfit.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">From completed loads</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 10).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${txn.payment_direction === 'received' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950'}`}>
                        {txn.payment_direction === 'received' ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{txn.party_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{txn.payment_method}</Badge>
                          <span>{new Date(txn.transaction_date).toLocaleDateString()}</span>
                          {txn.payment_sequence && <span>Payment #{txn.payment_sequence}</span>}
                        </div>
                        {txn.payment_details && <p className="text-xs text-muted-foreground mt-1">{txn.payment_details}</p>}
                        {txn.notes && <p className="text-xs text-muted-foreground italic mt-1">Note: {txn.notes}</p>}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${txn.payment_direction === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.payment_direction === 'received' ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{activeLoads.length} Active Load(s)</h2>
          </div>
          {activeLoads.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeLoads.map(load => (
                <LoadKathaCard key={load.id} load={load} transactions={transactionsByLoad[load.id] || []} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active loads. All loads are completed!
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{completedLoads.length} Completed Load(s)</h2>
          </div>
          {completedLoads.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {completedLoads.map(load => (
                <LoadKathaCard key={load.id} load={load} transactions={transactionsByLoad[load.id] || []} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed loads yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Expected Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">₹{totalExpectedProfit.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">From all loads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Realized Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">₹{totalRealizedProfit.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">From completed loads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ₹{completedLoads.length > 0 ? (totalRealizedProfit / completedLoads.length).toLocaleString('en-IN', {maximumFractionDigits: 0}) : '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per completed load</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit by Load Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  loads.reduce((acc, load) => {
                    const providerName = load.load_providers?.company_name || 'Unknown';
                    if (!acc[providerName]) {
                      acc[providerName] = { totalProfit: 0, count: 0, completed: 0 };
                    }
                    acc[providerName].totalProfit += load.profit_amount || 0;
                    acc[providerName].count += 1;
                    if (load.status === 'completed') acc[providerName].completed += 1;
                    return acc;
                  }, {} as Record<string, { totalProfit: number; count: number; completed: number }>)
                ).map(([provider, data]: [string, any]) => (
                  <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{provider}</p>
                      <p className="text-sm text-muted-foreground">{data.completed} of {data.count} loads completed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">₹{data.totalProfit.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">Total profit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashLedger;
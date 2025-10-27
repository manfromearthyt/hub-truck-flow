import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface LoadReport {
  id: string;
  loading_location: string;
  unloading_location: string;
  freight_amount: number;
  status: string;
  created_at: string;
  load_providers: { company_name: string } | null;
  trucks: { truck_number: string } | null;
}

interface TransactionReport {
  id: string;
  amount: number;
  transaction_type: string;
  payment_method: string;
  transaction_date: string;
  loads: {
    loading_location: string;
    unloading_location: string;
  } | null;
}

const Reports = () => {
  const [dailyLoads, setDailyLoads] = useState<LoadReport[]>([]);
  const [weeklyLoads, setWeeklyLoads] = useState<LoadReport[]>([]);
  const [monthlyLoads, setMonthlyLoads] = useState<LoadReport[]>([]);
  const [dailyTransactions, setDailyTransactions] = useState<TransactionReport[]>([]);
  const [weeklyTransactions, setWeeklyTransactions] = useState<TransactionReport[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<TransactionReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const weekEnd = endOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Fetch loads
      const [daily, weekly, monthly] = await Promise.all([
        supabase
          .from("loads")
          .select("*, load_providers(company_name), trucks(truck_number)")
          .eq("user_id", user.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd),
        supabase
          .from("loads")
          .select("*, load_providers(company_name), trucks(truck_number)")
          .eq("user_id", user.id)
          .gte("created_at", weekStart)
          .lte("created_at", weekEnd),
        supabase
          .from("loads")
          .select("*, load_providers(company_name), trucks(truck_number)")
          .eq("user_id", user.id)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
      ]);

      setDailyLoads(daily.data || []);
      setWeeklyLoads(weekly.data || []);
      setMonthlyLoads(monthly.data || []);

      // Fetch transactions
      const [dailyTxn, weeklyTxn, monthlyTxn] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, loads(loading_location, unloading_location)")
          .eq("user_id", user.id)
          .gte("transaction_date", todayStart)
          .lte("transaction_date", todayEnd),
        supabase
          .from("transactions")
          .select("*, loads(loading_location, unloading_location)")
          .eq("user_id", user.id)
          .gte("transaction_date", weekStart)
          .lte("transaction_date", weekEnd),
        supabase
          .from("transactions")
          .select("*, loads(loading_location, unloading_location)")
          .eq("user_id", user.id)
          .gte("transaction_date", monthStart)
          .lte("transaction_date", monthEnd),
      ]);

      setDailyTransactions(dailyTxn.data || []);
      setWeeklyTransactions(weeklyTxn.data || []);
      setMonthlyTransactions(monthlyTxn.data || []);
    } catch (error: any) {
      toast.error("Error loading reports: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const LoadsTable = ({ loads }: { loads: LoadReport[] }) => {
    const totalRevenue = loads.reduce((sum, load) => sum + Number(load.freight_amount), 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{loads.length} loads</p>
          <Badge variant="outline" className="text-lg">
            Total: ₹{totalRevenue.toLocaleString("en-IN")}
          </Badge>
        </div>
        {loads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No loads found</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Freight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loads.map((load) => (
                  <TableRow key={load.id}>
                    <TableCell>{load.load_providers?.company_name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{load.loading_location}</div>
                        <div className="text-muted-foreground">→ {load.unloading_location}</div>
                      </div>
                    </TableCell>
                    <TableCell>{load.trucks?.truck_number || "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={load.status === "completed" ? "default" : "secondary"}>
                        {load.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(load.freight_amount).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const TransactionsTable = ({ transactions }: { transactions: TransactionReport[] }) => {
    const totalAmount = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{transactions.length} transactions</p>
          <Badge variant="outline" className="text-lg">
            Total: ₹{totalAmount.toLocaleString("en-IN")}
          </Badge>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No transactions found</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.transaction_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={txn.transaction_type === "advance" ? "secondary" : "default"}>
                        {txn.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase">{txn.payment_method}</TableCell>
                    <TableCell className="text-sm">
                      {txn.loads ? `${txn.loads.loading_location} → ${txn.loads.unloading_location}` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(txn.amount).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports</h1>
        <p className="text-muted-foreground">View daily, weekly, and monthly reports</p>
      </div>

      <Tabs defaultValue="loads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="loads">Loads Report</TabsTrigger>
          <TabsTrigger value="transactions">Transactions Report</TabsTrigger>
        </TabsList>

        <TabsContent value="loads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Loads</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadsTable loads={dailyLoads} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Loads</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadsTable loads={weeklyLoads} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Loads</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadsTable loads={monthlyLoads} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={dailyTransactions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={weeklyTransactions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionsTable transactions={monthlyTransactions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

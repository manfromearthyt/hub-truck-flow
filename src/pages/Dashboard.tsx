import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, Package, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTrucks: 0,
    totalLoadProviders: 0,
    activeLoads: 0,
    completedLoads: 0,
    pendingRevenue: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [trucks, loadProviders, loads, transactions] = await Promise.all([
        supabase.from("trucks").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("load_providers").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("loads").select("*").eq("user_id", user.id),
        supabase.from("transactions").select("amount, transaction_type").eq("user_id", user.id),
      ]);

      const activeLoads = loads.data?.filter(l => l.status !== "completed").length || 0;
      const completedLoads = loads.data?.filter(l => l.status === "completed").length || 0;
      
      const totalRevenue = loads.data?.reduce((sum, load) => sum + Number(load.freight_amount), 0) || 0;
      const paidAmount = transactions.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const pendingRevenue = totalRevenue - paidAmount;

      setStats({
        totalTrucks: trucks.count || 0,
        totalLoadProviders: loadProviders.count || 0,
        activeLoads,
        completedLoads,
        pendingRevenue,
      });
    };

    fetchStats();

    const channel = supabase.channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "load_providers" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    {
      title: "Total Trucks",
      value: stats.totalTrucks,
      icon: Truck,
      color: "text-primary",
    },
    {
      title: "Load Providers",
      value: stats.totalLoadProviders,
      icon: Users,
      color: "text-info",
    },
    {
      title: "Active Loads",
      value: stats.activeLoads,
      icon: Package,
      color: "text-warning",
    },
    {
      title: "Completed Loads",
      value: stats.completedLoads,
      icon: Package,
      color: "text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your freight operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pending Revenue</span>
              <Badge variant="outline" className="text-lg font-semibold">
                ₹{stats.pendingRevenue.toLocaleString("en-IN")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

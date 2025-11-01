import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface LoadKathaCardProps {
  load: any;
  transactions: any[];
}

export const LoadKathaCard = ({ load, transactions }: LoadKathaCardProps) => {
  const received = transactions.filter(t => t.payment_direction === 'received').reduce((sum, t) => sum + Number(t.amount), 0);
  const paid = transactions.filter(t => t.payment_direction === 'paid').reduce((sum, t) => sum + Number(t.amount), 0);
  
  const providerFreight = load.freight_amount || 0;
  const truckFreight = load.truck_freight_amount || 0;
  const balanceToReceive = providerFreight - received;
  const balanceToPay = truckFreight - paid;
  const currentProfit = received - paid;
  const expectedProfit = load.profit_amount || 0;
  
  return (
    <Card className="p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{load.load_providers?.company_name}</h3>
          <p className="text-sm text-muted-foreground">{load.loading_location} → {load.unloading_location}</p>
          <div className="mt-2">
            <Badge variant={load.status === 'completed' ? 'default' : 'secondary'} className={load.status === 'completed' ? 'bg-green-600' : ''}>
              {load.status}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Load ID</p>
          <p className="font-mono text-xs text-muted-foreground">{load.id.slice(0, 8)}</p>
        </div>
      </div>
      
      {/* Financial Summary Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">FROM PROVIDER</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Freight:</span>
              <span className="font-bold">₹{providerFreight.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-700 dark:text-green-400">Received:</span>
              <span className="font-bold text-green-700 dark:text-green-400">₹{received.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-sm">
              <span className="text-orange-700 dark:text-orange-400">Balance Due:</span>
              <span className="font-bold text-orange-700 dark:text-orange-400">₹{balanceToReceive.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-2">TO DRIVER</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Freight:</span>
              <span className="font-bold">₹{truckFreight.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-700 dark:text-red-400">Paid:</span>
              <span className="font-bold text-red-700 dark:text-red-400">₹{paid.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t pt-1 text-sm">
              <span className="text-orange-700 dark:text-orange-400">Balance to Pay:</span>
              <span className="font-bold text-orange-700 dark:text-orange-400">₹{balanceToPay.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profit Tracking */}
      {expectedProfit > 0 && (
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-2">PROFIT TRACKING</p>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Expected Profit:</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">₹{expectedProfit.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Profit:</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">₹{currentProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <Progress value={(currentProfit / expectedProfit) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {((currentProfit / expectedProfit) * 100).toFixed(0)}% profit realized
          </p>
        </div>
      )}
      
      {/* Payment Timeline Summary */}
      <div className="mt-4 pt-3 border-t">
        <p className="text-xs text-muted-foreground">{transactions.length} transaction(s) recorded</p>
      </div>
    </Card>
  );
};
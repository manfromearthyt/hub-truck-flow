import { ArrowDownCircle, ArrowUpCircle, Calendar, CreditCard, Wallet } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  transaction_type: "advance" | "balance";
  payment_direction: "received" | "paid";
  amount: number;
  payment_method: "cash" | "upi" | "bank_transfer";
  party_name: string | null;
  transaction_date: string;
  payment_details: string | null;
  notes: string | null;
}

interface LoadTransactionTimelineProps {
  transactions: Transaction[];
}

export const LoadTransactionTimeline = ({ transactions }: LoadTransactionTimelineProps) => {
  const sortedTxns = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Wallet className="h-4 w-4" />;
      case "upi":
        return <CreditCard className="h-4 w-4" />;
      case "bank_transfer":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Transaction Timeline
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Timeline items */}
        <div className="space-y-6">
          {sortedTxns.map((txn, index) => {
            const isReceived = txn.payment_direction === "received";
            const isAdvance = txn.transaction_type === "advance";
            
            return (
              <div key={txn.id} className="relative pl-16">
                {/* Timeline dot */}
                <div 
                  className={`absolute left-4 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                    isReceived 
                      ? "bg-success border-success" 
                      : "bg-destructive border-destructive"
                  }`}
                />
                
                {/* Card */}
                <div className={`rounded-lg border p-4 ${
                  isReceived 
                    ? "bg-success/5 border-success/20" 
                    : "bg-destructive/5 border-destructive/20"
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isReceived ? (
                        <ArrowDownCircle className="h-5 w-5 text-success" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-semibold">
                        {isReceived ? "Received" : "Paid"} - {isAdvance ? "Advance" : "Balance"}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${
                      isReceived ? "text-success" : "text-destructive"
                    }`}>
                      {isReceived ? "+" : "-"}₹{txn.amount.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {txn.party_name && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {isReceived ? "From:" : "To:"} {txn.party_name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(txn.payment_method)}
                      <span className="capitalize">{txn.payment_method.replace("_", " ")}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(txn.transaction_date), "dd MMM yyyy, hh:mm a")}</span>
                    </div>
                    
                    {txn.payment_details && (
                      <div className="text-xs bg-background/50 rounded p-2 mt-2">
                        {txn.payment_details}
                      </div>
                    )}
                    
                    {txn.notes && (
                      <div className="text-xs italic mt-1">
                        Note: {txn.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {sortedTxns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No transactions recorded yet
          </div>
        )}
      </div>
    </div>
  );
};

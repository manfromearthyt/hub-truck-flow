import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Load } from "@/pages/Loads";
import { LoadDetailsDialog } from "./LoadDetailsDialog";
import { useState } from "react";

interface LoadListProps {
  loads: Load[];
  loading: boolean;
  onUpdate: () => void;
}

export const LoadList = ({ loads, loading, onUpdate }: LoadListProps) => {
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (loads.length === 0) return <div className="text-center py-8 text-muted-foreground">No loads found</div>;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "secondary",
      assigned: "default",
      in_transit: "default",
      delivered: "default",
      completed: "outline",
    };
    return colors[status] || "secondary";
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Truck</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads.map((load) => (
              <TableRow key={load.id}>
                <TableCell className="font-medium">{load.load_providers?.company_name || "N/A"}</TableCell>
                <TableCell><div className="text-sm"><div>{load.loading_location}</div><div className="text-muted-foreground">→ {load.unloading_location}</div></div></TableCell>
                <TableCell><div className="text-sm"><div>{load.material_description}</div><div className="text-muted-foreground">{load.material_weight} tons</div></div></TableCell>
                <TableCell>{load.trucks?.truck_number || <Badge variant="outline">Unassigned</Badge>}</TableCell>
                <TableCell><Badge variant={getStatusColor(load.status) as any}>{load.status}</Badge></TableCell>
                <TableCell className="text-right">₹{Number(load.freight_amount).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedLoad(load)}>Details</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <LoadDetailsDialog load={selectedLoad} onOpenChange={(open) => !open && setSelectedLoad(null)} onUpdate={onUpdate} />
    </>
  );
};

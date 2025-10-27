import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { Truck } from "@/pages/Trucks";

interface TruckListProps {
  trucks: Truck[];
  loading: boolean;
  onEdit: (truck: Truck) => void;
  onDelete: (id: string) => void;
}

export const TruckList = ({
  trucks,
  loading,
  onEdit,
  onDelete,
}: TruckListProps) => {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (trucks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No trucks found. Add your first truck to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Truck Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trucks.map((truck) => (
            <TableRow key={truck.id}>
              <TableCell className="font-medium">{truck.truck_number}</TableCell>
              <TableCell>
                <Badge variant={truck.truck_type === "container" ? "default" : "secondary"}>
                  {truck.truck_type}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{truck.driver_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {truck.driver_phone}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{truck.owner_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {truck.owner_phone}
                  </div>
                </div>
              </TableCell>
              <TableCell>{truck.truck_length} ft</TableCell>
              <TableCell>{truck.carrying_capacity} tons</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(truck)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this truck?"
                        )
                      ) {
                        onDelete(truck.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

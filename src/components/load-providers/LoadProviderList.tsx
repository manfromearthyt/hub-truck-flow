import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Mail, MapPin } from "lucide-react";
import { LoadProvider } from "@/pages/LoadProviders";

interface LoadProviderListProps {
  providers: LoadProvider[];
  loading: boolean;
  onEdit: (provider: LoadProvider) => void;
  onDelete: (id: string) => void;
}

export const LoadProviderList = ({
  providers,
  loading,
  onEdit,
  onDelete,
}: LoadProviderListProps) => {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No load providers found. Add your first provider to get started.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell className="font-medium">
                {provider.company_name}
              </TableCell>
              <TableCell>{provider.contact_person}</TableCell>
              <TableCell>{provider.contact_phone}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {provider.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {provider.email}
                    </div>
                  )}
                  {provider.address && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {provider.address}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(provider)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this provider?"
                        )
                      ) {
                        onDelete(provider.id);
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function HelpInbox() {

  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests } = useQuery({
    queryKey: ["/api/help-requests"],
    queryFn: async () => {
      const res = await fetch("/api/help-requests", {
        headers: {
          "x-employee-id": String(user?.id),
        },
      });

      return res.json();
    },
    refetchInterval: 5000
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const res = await apiRequest(
        "PATCH",
        `/api/help-requests/${id}`,
        { status }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });

      toast({
        title: "Updated",
        description: "Request status updated."
      });
    }
  });

  const incoming =
  Array.isArray(requests)
    ? requests.filter(
        (r: any) =>
          r.helperId === user?.id &&
          r.status === "pending"
      )
    : [];

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">Help Request Inbox</h1>

      {incoming.length === 0 && (
        <p className="text-gray-500">
          No pending help requests.
        </p>
      )}

      {incoming.map((req: any) => (

        <Card key={req.id} className="rounded-xl">

          <CardHeader>
            <CardTitle>
              {req.requester?.name} requested assistance
            </CardTitle>
          </CardHeader>

          <CardContent className="flex gap-4">

            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() =>
                updateMutation.mutate({
                  id: req.id,
                  status: "accepted"
                })
              }
            >
              Accept
            </Button>

            <Button
              variant="destructive"
              onClick={() =>
                updateMutation.mutate({
                  id: req.id,
                  status: "rejected"
                })
              }
            >
              Reject
            </Button>

          </CardContent>

        </Card>

      ))}

    </div>
  );
}
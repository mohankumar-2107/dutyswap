import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function HelpInbox() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");

  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ["/api/help-requests"],
    enabled: !!user?.id,
    refetchInterval: 3000,
    queryFn: async () => {
      const res = await fetch("/api/help-requests", {
        headers: { "x-employee-id": String(user?.id) }
      });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: chatMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/messages", activeChat?.id],
    enabled: !!activeChat,
    queryFn: async () => {
      // Will be re-fetched with correct canonicalChatId once requests load
      if (!activeChat || !Array.isArray(requests)) return [];
      const partnerId = activeChat.requesterId === user?.id ? activeChat.helperId : activeChat.requesterId;
      const allBetweenPair = requests.filter(
        (r: any) =>
          (r.requesterId === user?.id && r.helperId === partnerId) ||
          (r.requesterId === partnerId && r.helperId === user?.id)
      );
      const sharedId = Math.min(...allBetweenPair.map((r: any) => r.id));
      const res = await fetch(`/api/messages/${sharedId}`);
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((msg: any) => ({
        ...msg,
        senderId: msg.senderId ?? msg.sender_id,
        helpRequestId: msg.helpRequestId ?? msg.help_request_id,
      }));
    },
    refetchInterval: 2000
  });

  // ✅ FIX: Don't call .json() on apiRequest — it already returns parsed data
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/help-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-employee-id": String(user?.id),
        },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!activeChat || !user || !chatMessage.trim() || !Array.isArray(requests)) return;
      // ✅ Compute canonical shared thread ID inline
      const partnerId = activeChat.requesterId === user.id ? activeChat.helperId : activeChat.requesterId;
      const allBetweenPair = requests.filter(
        (r: any) =>
          (r.requesterId === user.id && r.helperId === partnerId) ||
          (r.requesterId === partnerId && r.helperId === user.id)
      );
      const sharedId = Math.min(...allBetweenPair.map((r: any) => r.id));
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpRequestId: sharedId,
          senderId: user.id,
          content: chatMessage.trim()
        })
      });
      return res.json();
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", activeChat?.id] });
    }
  });

  const incoming = Array.isArray(requests)
    ? requests.filter((r: any) => r.helperId === user?.id && r.status === "pending")
    : [];

  // ✅ FIX: Both sides (requester AND helper) see accepted chats
  // Deduplicate by partner — for each unique pair, keep latest accepted request
  const activeChats = Array.isArray(requests)
    ? Object.values(
        requests
          .filter((r: any) => r.status === "accepted")
          .reduce((acc: any, r: any) => {
            // Key by the OTHER person's ID (the partner)
            const partnerId =
              r.requesterId === user?.id ? r.helperId : r.requesterId;
            if (!acc[partnerId] || r.id > acc[partnerId].id) {
              acc[partnerId] = r;
            }
            return acc;
          }, {})
      )
    : [];

  const getChatPartnerName = (chat: any) => {
    if (!chat || !user) return "Peer";
    return (chat as any).requesterId === user.id
      ? (chat as any).helper?.name || "Helper"
      : (chat as any).requester?.name || "Requester";
  };

  return (
    // ✅ FIX 2: Use flex layout so chat panel sits beside content, not overlapping
    <div className="flex h-[calc(100vh-64px)]">
      
      {/* Left: Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Help Request Inbox</h1>

        {/* Pending Requests */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Pending Requests</h2>

          {incoming.length === 0 && (
            <p className="text-gray-500 text-sm italic">No pending help requests.</p>
          )}

          {incoming.map((req: any) => (
            <Card key={req.id} className="rounded-xl border border-yellow-100">
              <CardHeader>
                <CardTitle className="text-base">
                  {req.requester?.name} requested your assistance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl flex-1 font-bold"
                  onClick={() => {
                    updateMutation.mutate(
                      { id: req.id, status: "accepted" },
                      {
                        onSuccess: () => {
                          setActiveChat(req);
                          toast({
                            title: "✅ Accepted!",
                            description: `Chat with ${req.requester?.name} is now open.`
                          });
                        }
                      }
                    );
                  }}
                  disabled={updateMutation.isPending}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl flex-1 font-bold"
                  onClick={() =>
                    updateMutation.mutate({ id: req.id, status: "rejected" })
                  }
                  disabled={updateMutation.isPending}
                >
                  Reject
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Chats */}
        {(activeChats as any[]).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Active Chats</h2>
            {(activeChats as any[]).map((req: any) => (
              <Card
                key={req.id}
                className={`rounded-xl border cursor-pointer transition-colors ${
                  activeChat?.id === req.id
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-green-100 bg-green-50 hover:bg-green-100"
                }`}
                onClick={() => setActiveChat(activeChat?.id === req.id ? null : req)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <p className="font-bold text-green-800">{req.requester?.name}</p>
                  <span className="text-xs font-black text-green-600 uppercase">
                    {activeChat?.id === req.id ? "Active ✓" : "Open Chat →"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ✅ FIX 3: Chat panel as right sidebar in the same flex row — no overflow */}
      {activeChat && (
        <div className="w-80 border-l bg-white flex flex-col shrink-0">
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center bg-yellow-50 shrink-0">
            <div>
              <p className="font-black text-gray-900">💬 Chat</p>
              <p className="text-sm text-gray-500 font-medium">with {getChatPartnerName(activeChat)}</p>
            </div>
            <button
              onClick={() => setActiveChat(null)}
              className="text-gray-400 hover:text-gray-700 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* ✅ FIX 4: Messages area uses min-h-0 to allow proper scroll inside flex */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 mt-8 italic">No messages yet. Say hello! 👋</p>
            ) : (
              chatMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`p-2 px-3 rounded-2xl text-sm max-w-[78%] break-words ${
                    msg.senderId === user?.id
                      ? "bg-yellow-500 text-white ml-auto rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2 shrink-0">
            <input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatMessage.trim()) sendMessageMutation.mutate();
                }
              }}
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Type message..."
            />
            <button
              onClick={() => { if (chatMessage.trim()) sendMessageMutation.mutate(); }}
              disabled={!chatMessage.trim() || sendMessageMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white px-4 rounded-xl font-bold text-sm transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Users, Shield } from "lucide-react";

interface User {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
}

interface Group {
  id: number;
  name: string;
  type: string;
  description: string | null;
}

export default function UserManagementPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const updateUserGroupMutation = useMutation({
    mutationFn: async ({ userId, groupId, action }: { userId: number; groupId: number; action: 'add' | 'remove' }) => {
      const url = `/api/users/${userId}/groups/${groupId}`;
      const res = await fetch(url, {
        method: action === 'add' ? 'POST' : 'DELETE',
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user group");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.userId, "groups"] });
      toast({
        title: "그룹 변경 완료",
        description: "사용자 그룹이 업데이트되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "그룹 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 max-w-4xl flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">유저 관리</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              전체 사용자
            </CardTitle>
            <CardDescription>
              사용자의 그룹을 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.displayName || user.username}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {groups.map((group) => (
                        <UserGroupButton
                          key={group.id}
                          user={user}
                          group={group}
                          onUpdate={(action) => updateUserGroupMutation.mutate({ userId: user.id, groupId: group.id, action })}
                          isLoading={updateUserGroupMutation.isPending}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function UserGroupButton({ user, group, onUpdate, isLoading }: {
  user: User;
  group: Group;
  onUpdate: (action: 'add' | 'remove') => void;
  isLoading: boolean;
}) {
  const { data: userGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/users", user.id, "groups"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user.id}/groups`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const hasGroup = userGroups.some((g: Group) => g.id === group.id);

  return (
    <Button
      variant={hasGroup ? "default" : "outline"}
      size="sm"
      onClick={() => onUpdate(hasGroup ? 'remove' : 'add')}
      disabled={isLoading}
      data-testid={`button-${group.type}-${user.id}`}
    >
      {group.type === 'admin' ? <Shield className="h-4 w-4 mr-1" /> : <Users className="h-4 w-4 mr-1" />}
      {group.name}
    </Button>
  );
}

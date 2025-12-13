import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, useUpdateProfile, useChangePassword, useDeleteAccount, useLogout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User, Lock, Trash2, Key, Users, Plus, Pencil, X, Check } from "lucide-react";

const profileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("유효한 이메일을 입력하세요").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요"),
  newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 합니다"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmNewPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ConversationProfile {
  id: string;
  name: string;
  content: string;
}

export default function AccountPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const deleteAccountMutation = useDeleteAccount();
  const logoutMutation = useLogout();

  // Conversation Profiles
  const [conversationProfiles, setConversationProfiles] = useState<ConversationProfile[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState("");
  const [editingProfileContent, setEditingProfileContent] = useState("");
  const [isAddingProfile, setIsAddingProfile] = useState(false);

  const { data: profilesData, isLoading: profilesLoading } = useQuery<{ profiles: ConversationProfile[] }>({
    queryKey: ["/api/auth/conversation-profiles"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profilesData?.profiles) {
      setConversationProfiles(profilesData.profiles);
    }
  }, [profilesData]);

  const updateProfilesMutation = useMutation({
    mutationFn: async (profiles: ConversationProfile[]) => {
      const res = await fetch("/api/auth/conversation-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profiles");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/conversation-profiles"] });
      toast({
        title: "대화 프로필 저장 완료",
        description: "대화 프로필이 저장되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "대화 프로필 저장 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddProfile = () => {
    setIsAddingProfile(true);
    setEditingProfileName("");
    setEditingProfileContent("");
  };

  const handleSaveNewProfile = () => {
    if (!editingProfileName.trim()) {
      toast({
        title: "프로필 이름 필요",
        description: "프로필 이름을 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    const newProfile: ConversationProfile = {
      id: crypto.randomUUID(),
      name: editingProfileName.trim(),
      content: editingProfileContent,
    };
    const updatedProfiles = [...conversationProfiles, newProfile];
    setConversationProfiles(updatedProfiles);
    updateProfilesMutation.mutate(updatedProfiles);
    setIsAddingProfile(false);
  };

  const handleEditProfile = (profile: ConversationProfile) => {
    setEditingProfileId(profile.id);
    setEditingProfileName(profile.name);
    setEditingProfileContent(profile.content);
  };

  const handleSaveEditProfile = () => {
    if (!editingProfileName.trim()) {
      toast({
        title: "프로필 이름 필요",
        description: "프로필 이름을 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    const updatedProfiles = conversationProfiles.map(p => 
      p.id === editingProfileId 
        ? { ...p, name: editingProfileName.trim(), content: editingProfileContent }
        : p
    );
    setConversationProfiles(updatedProfiles);
    updateProfilesMutation.mutate(updatedProfiles);
    setEditingProfileId(null);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm("정말로 이 프로필을 삭제하시겠습니까?")) {
      const updatedProfiles = conversationProfiles.filter(p => p.id !== profileId);
      setConversationProfiles(updatedProfiles);
      updateProfilesMutation.mutate(updatedProfiles);
    }
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
    setIsAddingProfile(false);
  };

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        displayName: user.displayName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      toast({
        title: "프로필 업데이트 성공",
        description: "프로필이 업데이트되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "프로필 업데이트 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      await changePasswordMutation.mutateAsync(data);
      toast({
        title: "비밀번호 변경 성공",
        description: "비밀번호가 변경되었습니다.",
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "비밀번호 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      toast({
        title: "계정 삭제 완료",
        description: "계정이 삭제되었습니다.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "계정 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "로그아웃",
        description: "로그아웃되었습니다.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 max-w-2xl flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">계정 관리</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {user?.displayName || user?.username}
            </CardTitle>
            <CardDescription>
              @{user?.username}
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" data-testid="tab-profile">프로필</TabsTrigger>
            <TabsTrigger value="groups" data-testid="tab-groups">그룹</TabsTrigger>
            <TabsTrigger value="conversations" data-testid="tab-conversations">대화 프로필</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">보안</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>프로필 정보</CardTitle>
                <CardDescription>
                  프로필 정보를 수정하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">표시 이름</Label>
                    <Input
                      id="displayName"
                      data-testid="input-profile-displayname"
                      placeholder="표시될 이름"
                      {...profileForm.register("displayName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      data-testid="input-profile-email"
                      type="email"
                      placeholder="이메일 주소"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-save-profile"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    프로필 저장
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  내 그룹
                </CardTitle>
                <CardDescription>
                  소속된 그룹 정보를 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm">사용자</p>
                        <p className="text-xs text-muted-foreground">일반 사용자 그룹</p>
                      </div>
                    </div>
                    {user?.isAdmin && (
                      <>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <Key className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="font-medium text-sm">관리자</p>
                            <p className="text-xs text-muted-foreground">시스템 관리자 그룹</p>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => navigate("/admin/users")}
                          data-testid="button-manage-users"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          유저 관리
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations">
            {profilesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-muted/50 border-dashed">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      자주 사용하는 대화 프로필을 미리 등록해두세요. 게임 플레이 시 빠르게 선택하여 사용할 수 있습니다.
                    </p>
                  </CardContent>
                </Card>

                {conversationProfiles.map((profile) => (
                  <Card key={profile.id}>
                    {editingProfileId === profile.id ? (
                      <CardContent className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>프로필 이름</Label>
                          <Input
                            value={editingProfileName}
                            onChange={(e) => setEditingProfileName(e.target.value)}
                            placeholder="프로필 이름 (예: 첫사랑 로맨스)"
                            data-testid={`input-profile-name-${profile.id}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>프로필 내용</Label>
                          <Textarea
                            value={editingProfileContent}
                            onChange={(e) => setEditingProfileContent(e.target.value)}
                            placeholder="캐릭터 정보, 관계 설정, 시나리오 배경 등을 입력하세요..."
                            className="min-h-[120px]"
                            data-testid={`textarea-profile-content-${profile.id}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={handleSaveEditProfile}
                            disabled={updateProfilesMutation.isPending}
                            data-testid={`button-save-profile-${profile.id}`}
                          >
                            {updateProfilesMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            저장
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-edit-${profile.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {profile.name}
                            </CardTitle>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditProfile(profile)}
                                data-testid={`button-edit-profile-${profile.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteProfile(profile.id)}
                                data-testid={`button-delete-profile-${profile.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {profile.content || "(내용 없음)"}
                          </p>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}

                {isAddingProfile ? (
                  <Card>
                    <CardContent className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label>프로필 이름</Label>
                        <Input
                          value={editingProfileName}
                          onChange={(e) => setEditingProfileName(e.target.value)}
                          placeholder="프로필 이름 (예: 첫사랑 로맨스)"
                          data-testid="input-new-profile-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>프로필 내용</Label>
                        <Textarea
                          value={editingProfileContent}
                          onChange={(e) => setEditingProfileContent(e.target.value)}
                          placeholder="캐릭터 정보, 관계 설정, 시나리오 배경 등을 입력하세요..."
                          className="min-h-[120px]"
                          data-testid="textarea-new-profile-content"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSaveNewProfile}
                          disabled={updateProfilesMutation.isPending}
                          data-testid="button-save-new-profile"
                        >
                          {updateProfilesMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          저장
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                          data-testid="button-cancel-new-profile"
                        >
                          <X className="h-4 w-4 mr-2" />
                          취소
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleAddProfile}
                    data-testid="button-add-profile"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    새 프로필 추가
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="security">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  비밀번호 변경
                </CardTitle>
                <CardDescription>
                  계정 비밀번호를 변경하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">현재 비밀번호</Label>
                    <Input
                      id="currentPassword"
                      data-testid="input-current-password"
                      type="password"
                      placeholder="현재 비밀번호"
                      {...passwordForm.register("currentPassword")}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">새 비밀번호</Label>
                    <Input
                      id="newPassword"
                      data-testid="input-new-password"
                      type="password"
                      placeholder="새 비밀번호"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">새 비밀번호 확인</Label>
                    <Input
                      id="confirmNewPassword"
                      data-testid="input-confirm-new-password"
                      type="password"
                      placeholder="새 비밀번호 확인"
                      {...passwordForm.register("confirmNewPassword")}
                    />
                    {passwordForm.formState.errors.confirmNewPassword && (
                      <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmNewPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-change-password"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    비밀번호 변경
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  위험 구역
                </CardTitle>
                <CardDescription>
                  계정을 삭제하면 복구할 수 없습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full"
                  data-testid="button-logout"
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  로그아웃
                </Button>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      data-testid="button-delete-account"
                    >
                      계정 삭제
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>계정 삭제 확인</DialogTitle>
                      <DialogDescription>
                        정말로 계정을 삭제하시겠습니까? 이 작업은 취소할 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                        data-testid="button-cancel-delete"
                      >
                        취소
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteAccountMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        삭제 확인
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

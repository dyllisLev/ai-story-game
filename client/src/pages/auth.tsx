import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister, useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

const registerSchema = z.object({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  email: z.string().email("유효한 이메일을 입력하세요").optional().or(z.literal("")),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleLogin = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await registerMutation.mutateAsync(data);
      toast({
        title: "회원가입 성공",
        description: "환영합니다!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "회원가입 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-10 w-10 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">AI Story Game</h1>
          </div>
          <p className="text-gray-400">AI와 함께 만드는 인터랙티브 스토리</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">계정</CardTitle>
            <CardDescription className="text-gray-400">
              로그인하거나 새 계정을 만드세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">로그인</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">회원가입</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-gray-300">사용자명</Label>
                    <Input
                      id="login-username"
                      data-testid="input-login-username"
                      placeholder="사용자명을 입력하세요"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-400">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-300">비밀번호</Label>
                    <Input
                      id="login-password"
                      data-testid="input-login-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-login"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    로그인
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-gray-300">사용자명 *</Label>
                    <Input
                      id="register-username"
                      data-testid="input-register-username"
                      placeholder="사용자명을 입력하세요"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-400">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-displayName" className="text-gray-300">표시 이름</Label>
                    <Input
                      id="register-displayName"
                      data-testid="input-register-displayname"
                      placeholder="표시될 이름 (선택사항)"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...registerForm.register("displayName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-gray-300">이메일</Label>
                    <Input
                      id="register-email"
                      data-testid="input-register-email"
                      type="email"
                      placeholder="이메일 주소 (선택사항)"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-400">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-gray-300">비밀번호 *</Label>
                    <Input
                      id="register-password"
                      data-testid="input-register-password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-400">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirmPassword" className="text-gray-300">비밀번호 확인 *</Label>
                    <Input
                      id="register-confirmPassword"
                      data-testid="input-register-confirm-password"
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      className="bg-slate-700 border-slate-600 text-white"
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-400">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-register"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    회원가입
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 mt-4 text-sm">
          계정 없이도 앱을 사용할 수 있습니다.{" "}
          <button
            onClick={() => navigate("/")}
            className="text-purple-400 hover:text-purple-300 underline"
            data-testid="link-continue-without-login"
          >
            로그인 없이 계속하기
          </button>
        </p>
      </div>
    </div>
  );
}

import AuthPage from "@/components/auth/AuthPage";
import loginForm from "@/components/auth/login-form";

const LoginPage = () => {
  return <AuthPage title="Welcome back to Sage!" form={loginForm()} />;
};

export default LoginPage;

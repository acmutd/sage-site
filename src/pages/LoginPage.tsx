import AuthCard from "@/components/auth/AuthCard";
import loginForm from "@/components/auth/login-form";

const LoginPage = () => {
  return <AuthCard title="Welcome back to Sage!" form={loginForm()} />;
};

export default LoginPage;

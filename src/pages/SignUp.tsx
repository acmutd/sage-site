import AuthPage from "@/components/auth/AuthPage";
import signupForm from "@/components/auth/signup-form";

const SignupPage = () => {
  return <AuthPage title="Make an account with Sage" form={signupForm()} />;
};

export default SignupPage;

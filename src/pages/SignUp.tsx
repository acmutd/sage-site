import AuthCard from "@/components/auth/AuthCard";
import signupForm from "@/components/auth/signup-form";

const SignupPage = () => {
  return <AuthCard title="Make an account with Sage" form={signupForm()} />;
};

export default SignupPage;

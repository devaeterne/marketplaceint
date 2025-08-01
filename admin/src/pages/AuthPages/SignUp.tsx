import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Devaeterne MarketPlace Automation - Sign In "
        description="This is react admin template for Devaeterne MarketPlace Automation. including python, javascript, and typescript bots, FastAPI,and more."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}

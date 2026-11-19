import type { Metadata } from "next";
import { LoginForm } from "./(auth)/login/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function Home() {
  return <LoginForm />;
}

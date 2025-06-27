import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In | Brainrot Video Generator',
  description: 'Sign in to your Brainrot Video Generator account',
};

export default function LoginPage() {
  return <LoginForm />;
} 
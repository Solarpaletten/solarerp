'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export type AuthFormMode = 'login' | 'signup';

export type AuthFormData = {
  name?: string;
  email: string;
  password: string;
};

export type AuthFormProps = {
  mode: AuthFormMode;
  onSubmit: (data: AuthFormData) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function AuthForm({ mode, onSubmit, error, isLoading = false }: AuthFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isLogin = mode === 'login';
  const title = isLogin ? 'Sign In' : 'Create Account';
  const submitText = isLogin ? 'Sign In' : 'Create Account';
  const loadingText = isLogin ? 'Signing in...' : 'Creating account...';
  const switchText = isLogin
    ? "Don't have an account?"
    : 'Already have an account?';
  const switchLink = isLogin ? '/signup' : '/login';
  const switchLinkText = isLogin ? 'Sign up' : 'Sign in';

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isLogin && !form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!isLogin && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    await onSubmit({
      ...(isLogin ? {} : { name: form.name }),
      email: form.email,
      password: form.password,
    });
  };

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
        {title}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <Input
            id="name"
            label="Name"
            type="text"
            placeholder="John Doe"
            value={form.name}
            onChange={handleChange('name')}
            error={errors.name}
            required
          />
        )}

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
          autoComplete="email"
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          required
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {!isLogin && (
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? loadingText : submitText}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {switchText}{' '}
        <Link href={switchLink} className="text-blue-600 hover:underline font-medium">
          {switchLinkText}
        </Link>
      </p>
    </div>
  );
}

export default AuthForm;


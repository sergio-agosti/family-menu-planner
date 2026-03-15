import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);
    if (err) setError(err.message);
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-center text-xl font-semibold">
          {isSignUp ? "Create account" : "Sign in"}
        </h2>
        <Form onSubmit={handleSubmit} className="space-y-4">
          <FormField>
            <FormLabel htmlFor="auth-email">Email</FormLabel>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField>
            <FormLabel htmlFor="auth-password">Password</FormLabel>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </FormField>
          {error && <FormMessage role="alert">{error}</FormMessage>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
          </Button>
        </Form>
        <div className="relative">
          <span className="relative z-10 flex justify-center bg-card px-2 text-xs text-muted-foreground">
            or
          </span>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
        >
          Sign in with Google
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
            }}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "No account? Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

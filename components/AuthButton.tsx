"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthButtonProps = {
  onUserChange: (user: User | null) => void;
};

export default function AuthButton({ onUserChange }: AuthButtonProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      onUserChange(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      onUserChange(nextUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onUserChange]);

  const signIn = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMessage("Check your email for the magic link.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Sign in failed";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      const text = error instanceof Error ? error.message : "Sign out failed";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-600">{user.email}</span>
        <button
          onClick={signOut}
          disabled={loading}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-500 focus:outline-none sm:w-56"
      />
      <button
        onClick={signIn}
        disabled={loading || !email.trim()}
        className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {loading ? "Sending..." : "Sign in link"}
      </button>
      {message && <span className="text-xs text-stone-500">{message}</span>}
    </div>
  );
}

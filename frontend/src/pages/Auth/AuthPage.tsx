import type { ReactNode } from "react";
import { env } from "../../utils/env";

interface AuthPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const AuthPage = ({ title, subtitle, children }: AuthPageProps) => (
  <main className="flex min-h-screen items-center justify-center bg-app-background px-4 py-10">
    <section className="w-full max-w-xl rounded-lg border border-app-border bg-app-surface p-6">
      <div className="mb-6">
        <div className="mb-4 text-sm font-semibold text-app-accent">
          {env.appName}
        </div>
        <h1 className="text-2xl font-semibold text-app-primary">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-app-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  </main>
);

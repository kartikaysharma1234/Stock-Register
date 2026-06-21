import type { ReactNode } from "react";

export const Main = ({ children }: { children: ReactNode }) => (
  <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
);

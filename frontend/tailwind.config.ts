import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          background: "#F8F9FA",
          surface: "#FFFFFF",
          border: "#E5E7EB",
          primary: "#111827",
          muted: "#6B7280",
          accent: "#4F46E5",
          accentHover: "#4338CA",
          success: "#059669",
          warning: "#D97706",
          error: "#DC2626",
          sidebar: "#111827",
          sidebarText: "#9CA3AF",
          sidebarActive: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        focus: "0 0 0 3px rgb(79 70 229 / 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;

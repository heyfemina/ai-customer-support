export const themes = {
  light: { name: "Light", primary: "#2563EB", primarySoft: "#DBEAFE", background: "#F8FAFC", surface: "#FFFFFF", surfaceAlt: "#F1F5F9", border: "#E2E8F0", text: "#0F172A", muted: "#64748B", sidebar: "#FFFFFF", topbar: "rgba(255,255,255,0.95)" },
  dark: { name: "Dark", primary: "#60A5FA", primarySoft: "#1E3A8A", background: "#0B1120", surface: "#1E293B", surfaceAlt: "#111827", border: "#475569", text: "#F8FAFC", muted: "#CBD5E1", sidebar: "#111827", topbar: "rgba(15,23,42,0.96)" },
  slate: { name: "Slate", primary: "#475569", primarySoft: "#E2E8F0", background: "#F1F5F9", surface: "#FFFFFF", surfaceAlt: "#E2E8F0", border: "#CBD5E1", text: "#0F172A", muted: "#64748B", sidebar: "#F8FAFC", topbar: "rgba(248,250,252,0.96)" },
  blue: { name: "Blue", primary: "#2563EB", primarySoft: "#DBEAFE", background: "#EFF6FF", surface: "#FFFFFF", surfaceAlt: "#DBEAFE", border: "#BFDBFE", text: "#172554", muted: "#475569", sidebar: "#EFF6FF", topbar: "rgba(239,246,255,0.96)" },
  emerald: { name: "Emerald", primary: "#059669", primarySoft: "#D1FAE5", background: "#ECFDF5", surface: "#FFFFFF", surfaceAlt: "#D1FAE5", border: "#A7F3D0", text: "#052E16", muted: "#475569", sidebar: "#ECFDF5", topbar: "rgba(236,253,245,0.96)" },
  violet: { name: "Violet", primary: "#7C3AED", primarySoft: "#EDE9FE", background: "#F5F3FF", surface: "#FFFFFF", surfaceAlt: "#EDE9FE", border: "#DDD6FE", text: "#2E1065", muted: "#64748B", sidebar: "#F5F3FF", topbar: "rgba(245,243,255,0.96)" },
  rose: { name: "Rose", primary: "#E11D48", primarySoft: "#FFE4E6", background: "#FFF1F2", surface: "#FFFFFF", surfaceAlt: "#FFE4E6", border: "#FECDD3", text: "#4C0519", muted: "#64748B", sidebar: "#FFF1F2", topbar: "rgba(255,241,242,0.96)" },
  amber: { name: "Amber", primary: "#D97706", primarySoft: "#FEF3C7", background: "#FFFBEB", surface: "#FFFFFF", surfaceAlt: "#FEF3C7", border: "#FDE68A", text: "#451A03", muted: "#64748B", sidebar: "#FFFBEB", topbar: "rgba(255,251,235,0.96)" },
  minimal: { name: "Minimal", primary: "#111827", primarySoft: "#E5E7EB", background: "#FAFAFA", surface: "#FFFFFF", surfaceAlt: "#F3F4F6", border: "#E5E7EB", text: "#111827", muted: "#6B7280", sidebar: "#FAFAFA", topbar: "rgba(250,250,250,0.96)" },
  corporate: { name: "Corporate", primary: "#1D4ED8", primarySoft: "#E0E7FF", background: "#F8FAFC", surface: "#FFFFFF", surfaceAlt: "#EEF2FF", border: "#D8E0EA", text: "#0F172A", muted: "#64748B", sidebar: "#F8FAFC", topbar: "rgba(248,250,252,0.96)" },
};

export const defaultThemeId = "light";

export function getTheme(id) {
  return themes[id] || themes[defaultThemeId];
}

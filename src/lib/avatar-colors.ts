// Deterministic gradient per name — same name always gets the same color
const GRADIENTS = [
  "linear-gradient(135deg, #8b5cf6, #7c3aed)", // violet
  "linear-gradient(135deg, #10b981, #059669)",  // emerald
  "linear-gradient(135deg, #3b82f6, #1d4ed8)",  // blue
  "linear-gradient(135deg, #f59e0b, #d97706)",  // amber
  "linear-gradient(135deg, #ec4899, #be185d)",  // pink
  "linear-gradient(135deg, #14b8a6, #0d9488)",  // teal
  "linear-gradient(135deg, #f97316, #ea580c)",  // orange
  "linear-gradient(135deg, #a855f7, #9333ea)",  // purple
];

export function nameToGradient(name: string): string {
  if (!name) return GRADIENTS[2];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

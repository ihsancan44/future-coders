import { BarChart3, Brain, Cpu, Gamepad2, Monitor, Server, ShieldCheck, Smartphone, Compass } from "lucide-react";

/** Sunucudaki alan anahtarlarına (backend/src/data/careers.js) karşılık gelen simgeler. */
export const CAREER_ICON = {
  frontend: Monitor,
  backend: Server,
  mobile: Smartphone,
  ai: Brain,
  data: BarChart3,
  cyber: ShieldCheck,
  iot: Cpu,
  game: Gamepad2,
};

export const careerIcon = (key) => CAREER_ICON[key] || Compass;

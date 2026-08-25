import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Scissors } from "lucide-react";

const ONBOARDING_SEEN_KEY = "barberflow.onboarding_seen";

export function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    const timer = setTimeout(() => {
      navigate(seen ? "/entrar-como" : "/onboarding", { replace: true });
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-ink-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 50% 50%, rgba(200,166,94,0.08) 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold">
            <Scissors size={28} className="text-ink-950" strokeWidth={1.5} />
          </div>
          <div className="absolute -inset-1.5 rounded-2xl border border-gold/20" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="font-serif text-4xl font-bold italic tracking-tight text-white">
            BarberFlow
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-ink-500">Marketplace</p>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-14 flex gap-2"
      >
        {[true, false, false].map((active, i) => (
          <div
            key={i}
            className="rounded-full bg-gold transition-all"
            style={{ width: active ? 20 : 4, height: 4, opacity: active ? 1 : 0.25 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

export { ONBOARDING_SEEN_KEY };

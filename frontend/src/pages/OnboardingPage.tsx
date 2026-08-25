import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import { ONBOARDING_SEEN_KEY } from "@/pages/SplashPage";

const STEPS = [
  {
    title: "Encontre a barbearia certa",
    sub: "Descubra barbearias próximas e agende em segundos.",
    img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&auto=format",
  },
  {
    title: "Escolha seu barbeiro",
    sub: "Veja avaliações, especialidades e disponibilidade em tempo real.",
    img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=1000&fit=crop&auto=format",
  },
  {
    title: "Gerencie sua barbearia",
    sub: "Controle agendamentos, equipe e financeiro em um só lugar.",
    img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&h=1000&fit=crop&auto=format",
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  function finish() {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    navigate("/entrar-como", { replace: true });
  }

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <div className="relative h-[54%] shrink-0 overflow-hidden">
        <motion.img
          key={step}
          initial={{ opacity: 0.6, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          src={current.img}
          alt={current.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
      </div>
      <div className="flex flex-1 flex-col justify-between px-6 pb-10 pt-4">
        <div className="flex flex-col gap-3">
          <motion.h2
            key={`t${step}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-2xl leading-tight text-white"
          >
            {current.title}
          </motion.h2>
          <motion.p
            key={`s${step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="text-sm leading-relaxed text-ink-400"
          >
            {current.sub}
          </motion.p>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-gold transition-all duration-300"
                style={{ width: i === step ? 24 : 4, opacity: i === step ? 1 : 0.25 }}
              />
            ))}
          </div>
          <button
            onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
            className="h-12 w-full rounded-xl bg-gold text-sm font-semibold text-ink-950"
          >
            {step < STEPS.length - 1 ? "Continuar" : "Começar"}
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={finish} className="text-center text-sm text-ink-500">
              Pular
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

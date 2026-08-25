import { create } from "zustand";

interface BookingFlowState {
  employeeId: string | null;
  employeeName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: string | null;
  serviceDuration: number | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  setBarber: (id: string, name: string) => void;
  setService: (id: string, name: string, price: string, duration: number) => void;
  setDateTime: (date: string, time: string) => void;
  reset: () => void;
}

/**
 * Estado efêmero do fluxo de agendamento (barbeiro → serviço → data/hora →
 * confirmação) — vive só na memória da aba, nunca persistido. Cada etapa é
 * uma rota real (compartilhável, funciona com o botão voltar do navegador);
 * isso só carrega as escolhas entre elas.
 */
export const useBookingFlowStore = create<BookingFlowState>((set) => ({
  employeeId: null,
  employeeName: null,
  serviceId: null,
  serviceName: null,
  servicePrice: null,
  serviceDuration: null,
  date: null,
  time: null,
  setBarber: (id, name) => set({ employeeId: id, employeeName: name }),
  setService: (id, name, price, duration) =>
    set({ serviceId: id, serviceName: name, servicePrice: price, serviceDuration: duration }),
  setDateTime: (date, time) => set({ date, time }),
  reset: () =>
    set({
      employeeId: null,
      employeeName: null,
      serviceId: null,
      serviceName: null,
      servicePrice: null,
      serviceDuration: null,
      date: null,
      time: null,
    }),
}));

import { useListarPedidos } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

export default function TVScreen() {
  const { data: pedidos } = useListarPedidos(
    undefined, 
    { query: { refetchInterval: 3000 } as any }
  );

  const emPreparo = pedidos?.filter(p => p.status === 'em_preparo').slice(0, 12) || [];
  const prontos = pedidos?.filter(p => p.status === 'pronto').slice(0, 8) || [];

  const prevProntosRef = useRef<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const currentProntosIds = prontos.map(p => p.id);
    const prevProntosIds = prevProntosRef.current;

    // Check if there is any new order in "Prontos" that wasn't there before
    const hasNewPronto = currentProntosIds.some(id => !prevProntosIds.includes(id));

    if (hasNewPronto && prevProntosIds.length > 0) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // reset
        audioRef.current.play().catch(e => console.error("Falha ao tocar som:", e));
      }
    }

    prevProntosRef.current = currentProntosIds;
  }, [prontos]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-white overflow-hidden">
      <audio ref={audioRef} src="/sounds/read.wav" preload="auto" />
      
      <main className="flex-1 flex w-full h-full">
        
        {/* Preparing Section */}
        <div className="w-7/12 bg-zinc-900 border-r border-zinc-800/80 flex flex-col p-8 relative overflow-hidden shadow-2xl z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
          
          <h1 className="text-5xl font-display font-bold text-zinc-500 mb-12 text-center uppercase tracking-widest relative z-10">
            Preparando
          </h1>
          
          <div className="flex flex-wrap content-start gap-6 relative z-10">
            <AnimatePresence>
              {emPreparo.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                  className="w-[calc(33.333%-1rem)] bg-zinc-800/80 backdrop-blur-sm rounded-3xl p-6 text-center shadow-lg border border-zinc-700/50"
                >
                  <span className="text-6xl font-display font-bold text-zinc-300 drop-shadow-sm">{p.numero}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Ready Section */}
        <div className="w-5/12 flex flex-col p-8 relative overflow-hidden bg-success/10">
          <div className="absolute inset-0 bg-gradient-to-b from-success/30 via-success/10 to-transparent pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-success/20 blur-[100px] rounded-full pointer-events-none" />
          
          <h1 className="text-6xl font-display font-black text-success mb-12 text-center uppercase tracking-widest relative z-10 drop-shadow-sm">
            Prontos
          </h1>
          
          <div className="flex flex-col gap-6 relative z-10">
            <AnimatePresence>
              {prontos.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 100, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -100, scale: 0.9 }}
                  layout
                  className={`
                    rounded-[2.5rem] p-8 text-center shadow-2xl border-2 transition-all
                    ${i === 0 
                      ? 'bg-success border-success-foreground/20 scale-105 shadow-success/30' 
                      : 'bg-zinc-900 border-success/30 shadow-black/50'}
                  `}
                >
                  <span className={`font-display font-black tracking-tighter drop-shadow-md ${i === 0 ? 'text-9xl text-white' : 'text-7xl text-success'}`}>
                    {p.numero}
                  </span>
                  {i === 0 && (
                    <div className="mt-4 text-3xl font-bold uppercase tracking-widest text-white/90 animate-pulse">
                      Retire seu pedido
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </main>
    </div>
  );
}

import { useListarPedidos } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { StandardNavbar } from "@/components/layout/Navbar";

export default function TVScreen() {
  const { data: pedidos } = useListarPedidos(
    undefined, 
    { query: { refetchInterval: 3000 } as any }
  );

  const emPreparo = pedidos?.filter(p => p.status === 'em_preparo').slice(0, 12) || [];
  const prontos = pedidos?.filter(p => p.status === 'pronto').slice(0, 8) || [];

  return (
    <div className="min-h-screen bg-black flex flex-col text-white overflow-hidden">
      {/* Minimal subtle nav for easy switching */}
      <div className="opacity-20 hover:opacity-100 transition-opacity">
        <StandardNavbar />
      </div>
      
      <main className="flex-1 flex w-full">
        
        {/* Preparing Section */}
        <div className="flex-1 bg-zinc-900 border-r border-zinc-800 flex flex-col p-8">
          <h1 className="text-5xl font-display font-bold text-zinc-400 mb-12 text-center uppercase tracking-widest">
            Preparando
          </h1>
          
          <div className="flex flex-wrap content-start gap-6">
            <AnimatePresence>
              {emPreparo.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                  className="w-[calc(33.333%-1rem)] bg-zinc-800 rounded-3xl p-6 text-center shadow-lg border border-zinc-700"
                >
                  <span className="text-6xl font-display font-bold text-zinc-300">{p.numero}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Ready Section */}
        <div className="w-5/12 bg-success/10 flex flex-col p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-success/20 to-transparent" />
          
          <h1 className="text-6xl font-display font-black text-success mb-12 text-center uppercase tracking-widest relative z-10 text-shadow-md">
            Prontos
          </h1>
          
          <div className="flex flex-col gap-6 relative z-10">
            <AnimatePresence>
              {prontos.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                  className={`
                    rounded-[3rem] p-8 text-center shadow-2xl border-4 
                    ${i === 0 
                      ? 'bg-success border-success-foreground/50 scale-105' 
                      : 'bg-zinc-800 border-success/30'}
                  `}
                >
                  <span className={`font-display font-black tracking-tighter ${i === 0 ? 'text-9xl text-white drop-shadow-lg' : 'text-7xl text-success'}`}>
                    {p.numero}
                  </span>
                  {i === 0 && (
                    <div className="mt-2 text-2xl font-bold uppercase tracking-widest opacity-90 animate-pulse">
                      Retire seu pedido!
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

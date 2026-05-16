import { motion } from "framer-motion";
import { Hand } from "lucide-react";

interface WelcomeProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeProps) {
  return (
    <div 
      className="fixed inset-0 w-full h-full flex flex-col bg-background cursor-pointer"
      onClick={onStart}
    >
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/kiosk-hero.png`} 
            alt="Delicious Burger" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full p-8 text-white">
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Logo" 
            className="w-64 h-64 object-contain mb-auto mt-24 drop-shadow-2xl"
          />

          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-32 text-center"
          >
            <h1 className="text-7xl font-display font-bold mb-6 text-shadow-md tracking-tight">
              O que vamos pedir hoje?
            </h1>
            <p className="text-3xl text-white/90 font-medium">
              Faça seu pedido aqui, rápido e fácil.
            </p>
          </motion.div>

          {/* Clean, Intuitive CTA Button */}
          <motion.div 
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="mb-16 mt-8 relative"
          >
            {/* Soft elegant shadow behind the pill */}
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-110 -z-10" />
            
            <div className="flex items-center gap-6 bg-white px-14 py-6 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/50">
              {/* Icon Container */}
              <div className="bg-primary/10 p-4 rounded-full flex items-center justify-center">
                <motion.div
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Hand className="w-12 h-12 text-primary" />
                </motion.div>
              </div>
              
              {/* Text Content */}
              <div className="flex flex-col items-start justify-center">
                <span className="text-4xl font-display font-black uppercase tracking-widest text-primary drop-shadow-sm">
                  Toque na Tela
                </span>
                <span className="text-xl font-bold text-primary/60 uppercase tracking-wider mt-1">
                  Para iniciar seu pedido
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

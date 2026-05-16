import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface SuccessScreenProps {
  orderNumber: string;
  onReset: () => void;
}

export function SuccessScreen({ orderNumber, onReset }: SuccessScreenProps) {
  
  useEffect(() => {
    // Auto reset after 10 seconds
    const timer = setTimeout(onReset, 10000);
    return () => clearTimeout(timer);
  }, [onReset]);

  return (
    <div 
      className="fixed inset-0 bg-primary flex flex-col items-center justify-center p-8 cursor-pointer"
      onClick={onReset}
    >
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="bg-card w-full max-w-3xl rounded-[3rem] p-16 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-32 h-32 bg-success/20 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-20 h-20 text-success" />
        </div>
        
        <h1 className="text-5xl font-display font-bold text-foreground mb-4">Pedido Confirmado!</h1>
        <p className="text-2xl text-muted-foreground mb-12">Seu pedido já foi enviado para a cozinha.</p>
        
        <div className="border-4 border-dashed border-border rounded-[2rem] p-8 w-full max-w-sm mb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-secondary/5" />
          <p className="text-lg text-muted-foreground mb-2 uppercase font-bold tracking-widest relative z-10">Senha do Pedido</p>
          <p className="text-8xl font-display font-black text-primary relative z-10 tracking-tighter">
            {orderNumber}
          </p>
        </div>

        <div className="flex items-center gap-6 text-left bg-muted p-6 rounded-2xl">
          <QRCodeSVG value={`receipt:${orderNumber}`} size={80} />
          <div>
            <p className="text-xl font-bold">Acompanhe pelo celular</p>
            <p className="text-muted-foreground">Escaneie para ver o status e a nota fiscal.</p>
          </div>
        </div>

      </motion.div>
      
      <p className="text-primary-foreground/80 mt-12 text-xl animate-pulse">Toque em qualquer lugar para voltar ao início</p>
    </div>
  );
}

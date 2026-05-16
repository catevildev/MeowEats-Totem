import { motion } from "framer-motion";
import { Utensils, ShoppingBag } from "lucide-react";
import { KioskHeader } from "@/components/kiosk/Header";

interface OrderTypeProps {
  onSelect: (type: 'comer_aqui' | 'para_viagem') => void;
  onBack: () => void;
}

export function OrderTypeScreen({ onSelect, onBack }: OrderTypeProps) {
  return (
    <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
      <KioskHeader showBack onBack={onBack} title="Como deseja seu pedido?" />
      
      <div className="flex-1 flex items-center justify-center p-8 gap-8 max-w-6xl mx-auto w-full">
        
        <motion.button
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect('comer_aqui')}
          className="flex-1 bg-card rounded-[3rem] p-16 flex flex-col items-center justify-center gap-8 shadow-xl shadow-black/5 border-4 border-transparent hover:border-primary transition-colors group aspect-square max-h-[600px]"
        >
          <div className="w-48 h-48 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500">
            <Utensils className="w-24 h-24 text-primary group-hover:text-white transition-colors duration-500" />
          </div>
          <h2 className="text-5xl font-display font-bold text-foreground">Comer Aqui</h2>
          <p className="text-2xl text-muted-foreground text-center">Vou saborear na loja</p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect('para_viagem')}
          className="flex-1 bg-card rounded-[3rem] p-16 flex flex-col items-center justify-center gap-8 shadow-xl shadow-black/5 border-4 border-transparent hover:border-secondary transition-colors group aspect-square max-h-[600px]"
        >
          <div className="w-48 h-48 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary transition-colors duration-500">
            <ShoppingBag className="w-24 h-24 text-secondary group-hover:text-secondary-foreground transition-colors duration-500" />
          </div>
          <h2 className="text-5xl font-display font-bold text-foreground">Para Viagem</h2>
          <p className="text-2xl text-muted-foreground text-center">Vou levar para casa</p>
        </motion.button>

      </div>
    </div>
  );
}

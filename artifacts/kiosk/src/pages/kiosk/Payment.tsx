import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Smartphone, Banknote, CheckCircle2, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCart } from "@/context/CartContext";
import { KioskHeader } from "@/components/kiosk/Header";
import { useCriarPedido, CriarPedidoInputFormaPagamento } from "@workspace/api-client-react";
import { formatCurrency, generateOrderNumber } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface PaymentScreenProps {
  onBack: () => void;
  onSuccess: (orderNumber: string) => void;
}

export function PaymentScreen({ onBack, onSuccess }: PaymentScreenProps) {
  const { total, items, orderType, clearCart } = useCart();
  const criarPedido = useCriarPedido();
  
  const [method, setMethod] = useState<CriarPedidoInputFormaPagamento | null>(null);
  const [status, setStatus] = useState<'selecting' | 'pix' | 'processing' | 'error'>('selecting');

  const handleSelectMethod = (selected: CriarPedidoInputFormaPagamento) => {
    setMethod(selected);
    if (selected === 'pix') {
      setStatus('pix');
      // Simulate auto-payment via PIX after 5 seconds
      setTimeout(() => processPayment('pix'), 5000);
    } else {
      processPayment(selected);
    }
  };

  const processPayment = async (forma: CriarPedidoInputFormaPagamento) => {
    setStatus('processing');
    
    try {
      // Simulate real-world terminal delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const payload = {
        tipoPedido: orderType || 'comer_aqui',
        formaPagamento: forma,
        itens: items.map(item => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          extrasIds: item.extras.map(e => e.id),
          observacoes: item.observacoes
        }))
      };

      // Ensure API allows this structure based on schema
      const res = await criarPedido.mutateAsync({ data: payload });
      
      const orderNumber = res?.numero || generateOrderNumber();
      clearCart();
      onSuccess(orderNumber);
      
    } catch (error) {
      console.error("Payment failed", error);
      setStatus('error');
      setTimeout(() => setStatus('selecting'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-kiosk-bg flex flex-col">
      <KioskHeader 
        showBack={status === 'selecting'} 
        onBack={onBack} 
        title={status === 'selecting' ? "Escolha a forma de pagamento" : "Pagamento"} 
      />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          
          {status === 'selecting' && (
            <motion.div 
              key="selecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              <div className="col-span-1 sm:col-span-2 text-center mb-8">
                <p className="text-2xl text-muted-foreground">Total a pagar</p>
                <p className="text-6xl font-display font-bold text-primary mt-2">{formatCurrency(total)}</p>
              </div>

              <PaymentButton 
                icon={<CreditCard className="w-16 h-16" />} 
                label="Cartão de Crédito" 
                onClick={() => handleSelectMethod('credito')} 
              />
              <PaymentButton 
                icon={<CreditCard className="w-16 h-16" />} 
                label="Cartão de Débito" 
                onClick={() => handleSelectMethod('debito')} 
              />
              <PaymentButton 
                icon={<Smartphone className="w-16 h-16" />} 
                label="Aproximação (NFC)" 
                onClick={() => handleSelectMethod('nfc')} 
              />
              <PaymentButton 
                icon={<Banknote className="w-16 h-16" />} 
                label="PIX" 
                onClick={() => handleSelectMethod('pix')} 
                highlight
              />
            </motion.div>
          )}

          {status === 'pix' && (
            <motion.div 
              key="pix"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-[3rem] p-16 shadow-2xl flex flex-col items-center text-center max-w-2xl w-full"
            >
              <h2 className="text-4xl font-display font-bold mb-4">Pague com PIX</h2>
              <p className="text-2xl text-muted-foreground mb-8">Abra o app do seu banco e escaneie o código abaixo</p>
              
              <div className="bg-white p-6 rounded-3xl shadow-inner border mb-8">
                <QRCodeSVG value="https://example.com/pix-placeholder" size={250} level="H" />
              </div>
              
              <p className="text-3xl font-bold text-primary mb-4">{formatCurrency(total)}</p>
              <p className="text-muted-foreground animate-pulse">Aguardando pagamento...</p>
              
              <button 
                onClick={() => setStatus('selecting')}
                className="mt-8 px-8 py-4 rounded-xl border-2 text-muted-foreground hover:bg-muted font-bold text-xl"
              >
                Cancelar
              </button>
            </motion.div>
          )}

          {status === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-48 h-48 rounded-full border-8 border-primary/20 border-t-primary animate-spin mb-12" />
              <h2 className="text-5xl font-display font-bold mb-4">Processando Pagamento</h2>
              <p className="text-2xl text-muted-foreground">Por favor, siga as instruções na maquininha...</p>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center bg-destructive/10 text-destructive p-16 rounded-[3rem]"
            >
              <AlertCircle className="w-32 h-32 mb-8" />
              <h2 className="text-5xl font-display font-bold mb-4">Pagamento Recusado</h2>
              <p className="text-2xl">Por favor, tente novamente com outro cartão.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function PaymentButton({ icon, label, onClick, highlight = false }: { icon: React.ReactNode, label: string, onClick: () => void, highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-4 transition-all active:scale-95 shadow-lg
        ${highlight 
          ? 'bg-secondary/10 border-secondary text-secondary-foreground hover:bg-secondary/20' 
          : 'bg-card border-transparent hover:border-primary/50 text-foreground'}
      `}
    >
      <div className={`mb-6 ${highlight ? 'text-secondary' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <span className="text-3xl font-bold">{label}</span>
    </button>
  );
}

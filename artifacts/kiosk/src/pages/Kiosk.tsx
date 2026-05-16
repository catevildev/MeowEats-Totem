import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CartProvider } from "@/context/CartContext";
import { WelcomeScreen } from "./kiosk/Welcome";
import { OrderTypeScreen } from "./kiosk/OrderType";
import { MenuScreen } from "./kiosk/Menu";
import { CartScreen } from "./kiosk/Cart";
import { PaymentScreen } from "./kiosk/Payment";
import { SuccessScreen } from "./kiosk/Success";
import { useCart } from "@/context/CartContext";

type Step = 'welcome' | 'type' | 'menu' | 'cart' | 'payment' | 'success';

function KioskFlow() {
  const [step, setStep] = useState<Step>('welcome');
  const [orderNumber, setOrderNumber] = useState("");
  const { setOrderType, clearCart } = useCart();

  const resetKiosk = () => {
    clearCart();
    setOrderNumber("");
    setStep('welcome');
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeScreen key="welcome" onStart={() => setStep('type')} />
        )}
        
        {step === 'type' && (
          <OrderTypeScreen 
            key="type"
            onBack={() => setStep('welcome')}
            onSelect={(type) => {
              setOrderType(type);
              setStep('menu');
            }}
          />
        )}

        {step === 'menu' && (
          <MenuScreen 
            key="menu"
            onBack={() => setStep('type')}
            onGoToCart={() => setStep('cart')}
          />
        )}

        {step === 'cart' && (
          <CartScreen 
            key="cart"
            onBack={() => setStep('menu')}
            onProceed={() => setStep('payment')}
          />
        )}

        {step === 'payment' && (
          <PaymentScreen 
            key="payment"
            onBack={() => setStep('cart')}
            onSuccess={(num) => {
              setOrderNumber(num);
              setStep('success');
            }}
          />
        )}

        {step === 'success' && (
          <SuccessScreen 
            key="success"
            orderNumber={orderNumber}
            onReset={resetKiosk}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function KioskApp() {
  return (
    <CartProvider>
      <KioskFlow />
    </CartProvider>
  );
}

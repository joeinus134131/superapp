// Midtrans Snap payment gateway type declarations
interface Window {
  snap: {
    pay: (
      token: string,
      options: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }
    ) => void;
  };
}

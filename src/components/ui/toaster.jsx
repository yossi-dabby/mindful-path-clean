import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport } from
"@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      <ToastViewport>
        {toasts.filter((t) => t.open !== false).map(function ({ id, title, description, action, ...props }) {
          const handleDismiss = (event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            dismiss(id);
          };
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose
                aria-label="Close notification"
                onClick={handleDismiss}
                onPointerUp={handleDismiss}
              />
            </Toast>);

        })}
      </ToastViewport>
    </ToastProvider>);

}

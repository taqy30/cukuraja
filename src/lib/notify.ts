import { toast } from "sonner";

/** Notifikasi singkat menggantikan alert browser. */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description });
  },
  info(message: string, description?: string) {
    toast.message(message, { description });
  },
};

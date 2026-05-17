"use client";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
};

export default function AlertModal({
  open,
  title,
  message,
  type = "info",
  onClose,
}: Props) {
  if (!open) return null;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className={`h-4 w-4 rounded-full ${colors[type]}`} />

          <h2 className="text-2xl font-black text-black">
            {title || "Notification"}
          </h2>
        </div>

        <p className="text-base text-zinc-700">{message}</p>

        <button
          type="button"
          data-readonly-allow="true"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-black px-5 py-3 font-bold text-amber-300 transition hover:bg-zinc-800"
        >
          OK
        </button>
      </div>
    </div>
  );
}


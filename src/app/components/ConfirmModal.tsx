"use client";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-black">
          {title}
        </h2>

        <p className="mt-4 text-zinc-700">
          {message}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            data-readonly-allow="true"
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-zinc-100 px-5 py-3 font-bold"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-2xl px-5 py-3 font-bold text-white ${
              danger ? "bg-red-600" : "bg-black"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

type Props = {
  productId: string;
  stockLocationId: string;
};

function UploadDropzone({ productId, stockLocationId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (document: File) =>
      api.createStockMovement({
        productId,
        stockLocationId,
        quantity: 0,
        reference: document.name,
        reason: "Document importé",
        type: "IN",
        document,
      }),
    onSuccess: () => {
      setMessage("Document reçu, mouvement créé.");
      queryClient.invalidateQueries({ queryKey: ["stock", productId] });
      queryClient.invalidateQueries({ queryKey: ["movements", productId] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Import impossible");
    },
  });

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      mutation.mutate(dropped);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      mutation.mutate(picked);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="glass-panel border-dashed border-2 border-brand-200 px-4 py-6 text-center"
    >
      <p className="text-sm font-semibold text-ink-900">Glissez votre commande/facture/avoir</p>
      <p className="text-xs text-ink-500">Le document sera associé au produit et converti en mouvement.</p>
      <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
        Parcourir…
        <input type="file" className="hidden" onChange={handleSelect} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
      </label>
      {file ? <p className="mt-3 text-sm text-ink-700">Sélectionné : {file.name}</p> : null}
      {mutation.isPending ? <p className="text-xs text-brand-700">Import en cours…</p> : null}
      {message ? <p className="text-xs text-ink-600">{message}</p> : null}
    </div>
  );
}

export default UploadDropzone;

import { useState } from "react";

type Props = {
  productId: number;
  stockLocationId: number;
};

function UploadDropzone({ productId, stockLocationId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const writesDisabled = true;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setMessage("Import désactivé tant que le POST /stock-movements n'est pas disponible.");
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      setMessage("Import désactivé tant que le POST /stock-movements n'est pas disponible.");
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="glass-panel border-dashed border-2 border-brand-200 px-4 py-6 text-center"
    >
      <p className="text-sm font-semibold text-ink-900">Glissez votre commande/facture/avoir</p>
      <p className="text-xs text-ink-500">
        Le document sera associé au produit et converti en mouvement dès que l'endpoint de création sera prêt.
      </p>
      <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
        Parcourir…
        <input
          type="file"
          className="hidden"
          onChange={handleSelect}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          disabled={writesDisabled}
        />
      </label>
      {file ? <p className="mt-3 text-sm text-ink-700">Sélectionné : {file.name}</p> : null}
      {message ? <p className="text-xs text-ink-600">{message}</p> : null}
    </div>
  );
}

export default UploadDropzone;

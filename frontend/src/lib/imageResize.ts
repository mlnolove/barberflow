/** Redimensiona uma imagem escolhida no dispositivo e converte pra JPEG em
 * base64 (data URI) — usado pra guardar fotos direto num campo de texto do
 * banco, já que o app não tem um serviço de upload de arquivos separado. */
export async function fileToResizedDataUrl(
  file: File,
  maxDimension = 480,
  quality = 0.85,
): Promise<string> {
  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = sourceDataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// Perkecil foto di browser lalu ubah jadi data URL (JPEG) agar muat di dokumen Firestore (maks 1 MiB).
export async function resizeImage(file, maxSide = 320, quality = 0.8) {
  if (!file || !/^image\//.test(file.type)) throw new Error("File bukan gambar.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); // PNG transparan → latar putih
    ctx.drawImage(img, 0, 0, w, h);
    let q = quality, out = canvas.toDataURL("image/jpeg", q);
    while (out.length > 200_000 && q > 0.4) { q -= 0.1; out = canvas.toDataURL("image/jpeg", q); }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

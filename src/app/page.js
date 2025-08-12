"use client";

import React, { useState } from "react";
import { FileText, Download, Edit3, Send } from "lucide-react";

// ===== html2pdf.js dynamic import =====
let html2pdf;
if (typeof window !== "undefined") {
  import("html2pdf.js").then((mod) => {
    html2pdf = mod.default;
  });
}

// ===== Config nomor WhatsApp tujuan (format internasional tanpa +) =====
const WA_TARGET_NUMBER = "6281234567890"; // ganti sesuai kebutuhan

// ===== Tanggal lokal ID =====
const getFormattedDate = () => {
  const date = new Date();
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("id-ID", options);
};

// ===== Helper: format rupiah titik =====
const formatRupiah = (angka) =>
  angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ===== Helper: generate PDF jadi Blob =====
async function generatePdfBlob(elementId, filenameHint = "Surat_Penawaran") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`#${elementId} tidak ditemukan`);

  const opt = {
    margin: [8, 25.4, 25.4, 25.4],
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  // pastikan modul siap
  if (!html2pdf) {
    const mod = await import("html2pdf.js");
    html2pdf = mod.default;
  }

  const worker = html2pdf().from(element).set(opt);

  // Beberapa versi: output("blob"), ada yg outputPdf("blob")
  if (typeof worker.outputPdf === "function") {
    return await worker.outputPdf("blob");
  } else {
    return await worker.output("blob");
  }
}

// ===== Helper: download file dari Blob =====
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ===== Helper: upload ke /api/upload, return url =====
async function uploadBlobToVercelBlob(blob, filename) {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: "application/pdf" }));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Gagal upload file");
  }
  const { url } = await res.json();
  return url;
}

// ===== Helper: buka WhatsApp dengan teks berisi link =====
function openWhatsAppWithLink(phone, url, extraText) {
  const text = encodeURIComponent(`${extraText ? extraText + "\n" : ""}${url}`);
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}

// ===== Helper: share file ke aplikasi (mobile) =====
async function shareFileIfSupported(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Surat Penawaran",
      text: "Halo, berikut surat penawarannya.",
    });
    return true;
  }
  return false;
}

const SuratPenawaranGenerator = () => {
  const [formData, setFormData] = useState({
    kota: "Yogyakarta",
    tanggal: getFormattedDate(),
    kepada: "Bapak ......",
    perihal: "Penawaran Pembuatan Karoseri",
    penawaranAtas: "pembuatan karoseri body mikrobus",
    harga: "138.000.000",
    hargaTerbilang: "Seratus Tiga Puluh Delapan Juta Rupiah",
    penandatangan: "Anton Gunanjati",
    spesifikasi: {
      modelBody: "JB5",
      rangka: "Pipa Baja",
      kacaDepan: "Laminated 2pcs",
      kacaSamping: "Tempered Rayban Geser Bawah",
      kacaBelakang: "Tempered Rayban",
      pintuDepan: "Standar",
      pintuBelakang: "Lipat",
      lantai: "Plat Bordes",
      bangku: "Standar Karoseri",
      bangkuPenumpang: "17 Seats",
      lampuDepan: "JB5",
      lampuBelakang: "JB5",
      wiper: "Mercy",
      interior: "Cat + ACP",
      plafon: "Dum Depan ABS",
      bagasiPlafon: "Profile",
      audioVisual: "DVD, TV, Power, Speaker",
      wildop: "SR Chrome",
      cat: "Sesuai Permintaan",
    },
  });

  const [isEditing, setIsEditing] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleInputChange = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setBusy(true);
      const filename = `Surat_Penawaran_${formData.kepada.replace(
        /\s/g,
        "_"
      )}.pdf`;
      const blob = await generatePdfBlob("surat-container", filename);
      downloadBlob(blob, filename);
    } catch (e) {
      alert(e.message || "Gagal membuat PDF");
    } finally {
      setBusy(false);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      setBusy(true);
      const filename = `Surat_Penawaran_${formData.kepada.replace(
        /\s/g,
        "_"
      )}.pdf`;
      const blob = await generatePdfBlob("surat-container", filename);
      const file = new File([blob], filename, { type: "application/pdf" });

      // Coba Web Share API (mobile) dengan attach file langsung
      const shared = await shareFileIfSupported(file);
      if (shared) {
        setBusy(false);
        return;
      }

      // Fallback: upload ke Vercel Blob -> buka WA dengan link
      const url = await uploadBlobToVercelBlob(blob, filename);
      const extraText = `Halo, ini surat penawaran untuk ${formData.kepada} (${formData.perihal}).`;
      openWhatsAppWithLink(WA_TARGET_NUMBER, url, extraText);
    } catch (e) {
      alert(e.message || "Gagal mengirim via WhatsApp");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen pb-36">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Controls */}
        <div className="bg-green-600 text-white p-4 flex justify-between items-center flex-wrap">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <FileText className="w-6 h-6" />
            <h1 className="text-xl font-bold">
              Generator Surat Penawaran Karoseri Aji Putra
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={busy}
              className="flex items-center space-x-1 bg-green-500 hover:bg-green-700 px-3 py-2 rounded transition-colors text-sm md:text-base disabled:opacity-60">
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? "Preview" : "Edit"}</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              disabled={busy}
              className="flex items-center space-x-1 bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded transition-colors text-sm md:text-base disabled:opacity-60"
              title="Kirim via WhatsApp">
              <Send className="w-4 h-4" />
              <span>{busy ? "Memproses..." : "Kirim WA"}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={busy}
              className="flex items-center space-x-1 bg-yellow-500 hover:bg-yellow-600 px-3 py-2 rounded transition-colors text-sm md:text-base disabled:opacity-60">
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row">
          {/* Form Input Panel */}
          {isEditing && (
            <div className="w-full md:w-1/2 p-4 md:p-6 bg-gray-50 border-b md:border-r overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Data Surat
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kota
                    </label>
                    <input
                      type="text"
                      value={formData.kota}
                      onChange={(e) =>
                        handleInputChange("kota", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="text"
                      value={formData.tanggal}
                      onChange={(e) =>
                        handleInputChange("tanggal", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kepada
                  </label>
                  <input
                    type="text"
                    value={formData.kepada}
                    onChange={(e) =>
                      handleInputChange("kepada", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perihal
                  </label>
                  <input
                    type="text"
                    value={formData.perihal}
                    onChange={(e) =>
                      handleInputChange("perihal", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Penawaran atas
                  </label>
                  <input
                    type="text"
                    value={formData.penawaranAtas}
                    onChange={(e) =>
                      handleInputChange("penawaranAtas", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga (Rp)
                    </label>
                    <input
                      type="text"
                      value={formData.harga}
                      onChange={(e) =>
                        handleInputChange("harga", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga Terbilang
                    </label>
                    <input
                      type="text"
                      value={formData.hargaTerbilang}
                      onChange={(e) =>
                        handleInputChange("hargaTerbilang", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Penandatangan
                  </label>
                  <input
                    type="text"
                    value={formData.penandatangan}
                    onChange={(e) =>
                      handleInputChange("penandatangan", e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <h3 className="text-md font-semibold text-gray-800 mt-6 mb-3">
                  Spesifikasi Karoseri
                </h3>

                {Object.entries(formData.spesifikasi).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        handleInputChange(`spesifikasi.${key}`, e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Panel */}
          <div
            className={`${
              isEditing ? "w-full md:w-1/2" : "w-full"
            } p-4 md:p-8 bg-white`}>
            <div
              id="surat-container"
              className="max-w-full mx-auto bg-white text-[12px] sm:text-[14px]"
              style={{ fontFamily: "Calibri, sans-serif" }}>
              {/* Letterhead */}
              <div className="text-center pb-2 px-0">
                <img src="/header.png" alt="Header" className="w-full" />
              </div>

              {/* Date and Recipient */}
              <div className="mb-4">
                <div className="text-right mb-2">
                  <p>
                    {formData.kota}, {formData.tanggal}
                  </p>
                </div>
                <div className="mb-2">
                  <p>Kepada Yth.</p>
                  <p className="font-medium">{formData.kepada}</p>
                </div>
                <div className="mb-0">
                  <p className="font-bold">
                    Perihal : <u>{formData.perihal}</u>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="mb-4">
                <p className="mb-2">Dengan Hormat,</p>
                <p className="mb-2">
                  Melalui surat ini kami mengajukan penawaran atas{" "}
                  <span className="font-bold">{formData.penawaranAtas}</span>{" "}
                  seharga{" "}
                  <span className="font-bold">
                    Rp{formatRupiah(formData.harga)},00 (
                    {formData.hargaTerbilang})
                  </span>{" "}
                  dengan spesifikasi sebagai berikut:
                </p>

                {/* Specifications */}
                <div className="mb-4">
                  <table className="w-full">
                    <tbody>
                      {Object.entries(formData.spesifikasi).map(
                        ([key, value]) => (
                          <tr key={key} className="print-preview-border">
                            <td
                              className="py-px pr-2 font-medium capitalize"
                              style={{ width: "25%" }}>
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}{" "}
                            </td>
                            <td className="py-px">: {value}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mb-4">
                  Demikian surat Penawaran yang dapat kami sampaikan atas
                  perhatiannya kami ucapkan terima kasih.
                </p>

                {/* Signature */}
                <div className="text-left">
                  <p className="mb-2">Hormat Kami,</p>
                  <img
                    src="/ttd.png"
                    alt="Tanda Tangan"
                    style={{ width: "150px", marginBottom: "1rem" }}
                  />
                  <p className="font-bold -mt-4">{formData.penandatangan}</p>
                </div>
              </div>
            </div>
          </div>
          {/* End Preview */}
        </div>
      </div>
    </div>
  );
};

export default SuratPenawaranGenerator;

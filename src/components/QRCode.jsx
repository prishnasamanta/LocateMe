import { QRCodeSVG } from 'qrcode.react';
import GlassCard from './GlassCard';

export default function QRCodeDisplay({ url, name }) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Join me at ${name || 'this location'}: ${url}`)}`;

  return (
    <GlassCard className="flex flex-col items-center">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/50">QR Code</p>
      <div className="rounded-xl bg-white p-4">
        <QRCodeSVG value={url} size={160} level="M" />
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        Share via WhatsApp
      </a>
    </GlassCard>
  );
}

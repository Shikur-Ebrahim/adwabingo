import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Download, Copy, ExternalLink, QrCode, Sparkles, CheckCircle2, Sliders, RefreshCw, Send, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import QRCode from 'qrcode';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AdminQrCode() {
  const { user } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Customization options
  const [botUsername, setBotUsername] = useState('adwabingo_bot');
  const [roomTitle, setRoomTitle] = useState('OFFICIAL ADWA BINGO');
  const [startParam, setStartParam] = useState('qr');
  const [showOptions, setShowOptions] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sendingTg, setSendingTg] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string>('');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const getFullTelegramUrl = useCallback(() => {
    const cleanBot = botUsername.replace(/^@/, '').trim() || 'adwabingo_bot';
    const cleanParam = startParam.trim();
    if (cleanParam) {
      return `https://t.me/${cleanBot}?start=${encodeURIComponent(cleanParam)}`;
    }
    return `https://t.me/${cleanBot}`;
  }, [botUsername, startParam]);

  // Helper function to draw rounded rectangles on canvas
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Render High-Res Canva-style Luxury Poster onto Canvas
  const renderPoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HD Canvas Dimensions (2:3 Aspect Ratio)
    const W = 1200;
    const H = 1800;
    canvas.width = W;
    canvas.height = H;

    // 1. Luxury Cream Background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100);
    bgGrad.addColorStop(0, '#FCFBF7');
    bgGrad.addColorStop(0.7, '#FAF5EB');
    bgGrad.addColorStop(1, '#F3EAD8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Double Gold Decorative Borders
    const goldColor = '#C5A059';
    const lightGold = '#DFCA96';

    // Outer Border
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Inner Fine Border
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // Corner Diamond Accents
    const drawDiamond = (cx: number, cy: number, size: number) => {
      ctx.fillStyle = goldColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fill();
    };

    drawDiamond(36, 36, 8);
    drawDiamond(W - 36, 36, 8);
    drawDiamond(36, H - 36, 8);
    drawDiamond(W - 36, H - 36, 8);

    drawDiamond(48, 48, 4);
    drawDiamond(W - 48, 48, 4);
    drawDiamond(48, H - 48, 4);
    drawDiamond(W - 48, H - 48, 4);

    // 3. Top Crown & Crest Emblem
    const crestY = 110;

    // Crown
    ctx.fillStyle = '#C5A059';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 32, crestY - 14);
    ctx.lineTo(W / 2 - 40, crestY - 36);
    ctx.lineTo(W / 2 - 16, crestY - 24);
    ctx.lineTo(W / 2, crestY - 44);
    ctx.lineTo(W / 2 + 16, crestY - 24);
    ctx.lineTo(W / 2 + 40, crestY - 36);
    ctx.lineTo(W / 2 + 32, crestY - 14);
    ctx.closePath();
    ctx.fill();

    // Crest Circle
    ctx.beginPath();
    ctx.arc(W / 2, crestY + 16, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D4AF37';
    ctx.stroke();

    // Crest Monogram (AB)
    ctx.fillStyle = '#E5C578';
    ctx.font = '900 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AB', W / 2, crestY + 18);

    // Decorative Flourish Wings beside crest
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 50, crestY + 16);
    ctx.bezierCurveTo(W / 2 - 90, crestY + 2, W / 2 - 120, crestY + 24, W / 2 - 140, crestY + 16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + 50, crestY + 16);
    ctx.bezierCurveTo(W / 2 + 90, crestY + 2, W / 2 + 120, crestY + 24, W / 2 + 140, crestY + 16);
    ctx.stroke();

    // 4. Main Title: ADWA BINGO
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 68px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ADWA BINGO', W / 2, 245);

    // 5. Official Subtitle: OFFICIAL ADWA BINGO
    ctx.fillStyle = '#8C6D3B';
    ctx.font = '700 17px sans-serif';
    ctx.letterSpacing = '2px';
    const subText = (roomTitle || 'OFFICIAL ADWA BINGO').toUpperCase();
    const subWidth = ctx.measureText(subText).width;

    ctx.fillText(subText, W / 2, 285);

    // Lines beside subtitle
    ctx.strokeStyle = lightGold;
    ctx.lineWidth = 1.5;
    const lineMargin = 20;
    const lineLen = 140;
    ctx.beginPath();
    ctx.moveTo(W / 2 - subWidth / 2 - lineMargin - lineLen, 280);
    ctx.lineTo(W / 2 - subWidth / 2 - lineMargin, 280);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2 + subWidth / 2 + lineMargin, 280);
    ctx.lineTo(W / 2 + subWidth / 2 + lineMargin + lineLen, 280);
    ctx.stroke();

    // 6. "SCAN TO PLAY" Banner
    const s2pY = 345;
    ctx.fillStyle = '#C5A059';
    ctx.font = '900 40px "Times New Roman", Georgia, serif';
    ctx.fillText('SCAN TO PLAY', W / 2, s2pY);

    // Decorative Arrows on left and right
    const drawArrowWing = (cx: number, cy: number, flip: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-24, -14);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-24, 14);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-32, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawArrowWing(W / 2 - 200, s2pY - 12, false);
    drawArrowWing(W / 2 + 200, s2pY - 12, true);

    // 7. Gold Pill: "SCAN THE QR CODE TO Play & Win Cash!" (PERFECT NON-OVERLAPPING ALIGNMENT)
    const pillW = 680;
    const pillH = 58;
    const pillX = (W - pillW) / 2;
    const pillY = 380;

    const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pillGrad.addColorStop(0, '#F5DFB3');
    pillGrad.addColorStop(0.5, '#E9CA88');
    pillGrad.addColorStop(1, '#DFB86C');

    drawRoundRect(ctx, pillX, pillY, pillW, pillH, 29);
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#B88E3E';
    ctx.stroke();

    // Calculate exact width of each part so they NEVER overlap
    const part1 = 'SCAN THE QR CODE TO ';
    const part2 = 'Play & Win Cash!';

    ctx.font = '800 17px sans-serif';
    const w1 = ctx.measureText(part1).width;

    ctx.font = 'italic 700 24px "Times New Roman", Georgia, serif';
    const w2 = ctx.measureText(part2).width;

    const totalPillTextW = w1 + w2;
    const startPillX = (W - totalPillTextW) / 2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Draw Part 1
    ctx.fillStyle = '#543604';
    ctx.font = '800 17px sans-serif';
    ctx.fillText(part1, startPillX, pillY + pillH / 2);

    // Draw Part 2 directly after Part 1
    ctx.fillStyle = '#732E00';
    ctx.font = 'italic 700 24px "Times New Roman", Georgia, serif';
    ctx.fillText(part2, startPillX + w1, pillY + pillH / 2);

    // 8. White Rounded Frame for QR Code
    const qrCardSize = 740;
    const qrCardX = (W - qrCardSize) / 2;
    const qrCardY = 470;
    const qrCardR = 36;

    // Card shadow
    ctx.save();
    ctx.shadowColor = 'rgba(180, 140, 70, 0.22)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;

    drawRoundRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, qrCardR);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // Card Gold Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#D4AF37';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardSize, qrCardSize, qrCardR);
    ctx.stroke();

    // 9. Generate & Draw QR Code
    const targetUrl = getFullTelegramUrl();
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, targetUrl, {
      width: 660,
      margin: 1,
      color: {
        dark: '#0A0F1D',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    const qrX = qrCardX + (qrCardSize - 660) / 2;
    const qrY = qrCardY + (qrCardSize - 660) / 2;
    ctx.drawImage(qrCanvas, qrX, qrY, 660, 660);

    // 10. Center Badge on QR Code: "ADWA BINGO"
    const badgeW = 180;
    const badgeH = 74;
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = qrCardY + qrCardSize / 2 - badgeH / 2;
    const badgeR = 18;

    // Badge Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
    badgeGrad.addColorStop(0, '#E67E00');
    badgeGrad.addColorStop(1, '#D06000');
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.restore();

    // White Border on Badge
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FFFFFF';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR);
    ctx.stroke();

    // Badge Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 18px sans-serif';
    ctx.fillText('ADWA', W / 2, badgeY + 23);
    ctx.font = '900 24px sans-serif';
    ctx.fillText('BINGO', W / 2, badgeY + 50);

    // 11. Features Row under QR code
    const featsY = 1285;
    const features = [
      { icon: '🏆', title: 'JACKPOT' },
      { icon: '⚡', title: 'INSTANT PAY' },
      { icon: '🎱', title: '75 BINGO' },
      { icon: '🛡️', title: 'VERIFIED' },
    ];

    const colW = (W - 140) / 4;
    features.forEach((feat, i) => {
      const fx = 70 + i * colW + colW / 2;

      // Icon
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(feat.icon, fx, featsY);

      // Label
      ctx.fillStyle = '#5A4A32';
      ctx.font = '900 15px sans-serif';
      ctx.fillText(feat.title, fx, featsY + 36);

      // Divider line (except last)
      if (i < 3) {
        ctx.strokeStyle = '#E0CEAA';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70 + (i + 1) * colW, featsY - 14);
        ctx.lineTo(70 + (i + 1) * colW, featsY + 44);
        ctx.stroke();
      }
    });

    // 12. Script Motto
    const mottoY = 1410;
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'italic 700 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Real Players   ·   Good Luck   ·   Big Wins', W / 2, mottoY);

    // 13. Bot Handle Pill
    const botPillW = 420;
    const botPillH = 64;
    const botPillX = (W - botPillW) / 2;
    const botPillY = 1475;

    drawRoundRect(ctx, botPillX, botPillY, botPillW, botPillH, 32);
    ctx.fillStyle = '#FAF7F0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#C5A059';
    ctx.stroke();

    ctx.fillStyle = '#111827';
    ctx.font = '800 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`@${botUsername.replace(/^@/, '')}`, W / 2, botPillY + botPillH / 2);

    // 14. Footer Credits
    const footerY = 1580;
    ctx.fillStyle = '#8C7853';
    ctx.font = '600 17px sans-serif';
    ctx.fillText('Official Partner Network  •  Powered by ADWA BINGO', W / 2, footerY);

    // 15. Bottom Elegant Decorative Corner Arcs
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 1.5;

    // Bottom Left Arc
    ctx.beginPath();
    ctx.moveTo(48, H - 140);
    ctx.quadraticCurveTo(180, H - 48, W / 2 - 80, H - 48);
    ctx.stroke();

    // Bottom Right Arc
    ctx.beginPath();
    ctx.moveTo(W - 48, H - 140);
    ctx.quadraticCurveTo(W - 180, H - 48, W / 2 + 80, H - 48);
    ctx.stroke();

    drawDiamond(W / 2, H - 48, 6);

    // Export to Image Data URL for real <img> tag display (enables native mobile long-press "Save Image")
    try {
      const url = canvas.toDataURL('image/png', 1.0);
      setPosterUrl(url);
    } catch (e) {
      console.error('DataURL error:', e);
    }
  }, [botUsername, roomTitle, startParam, getFullTelegramUrl]);

  useEffect(() => {
    renderPoster();
  }, [renderPoster]);

  // Method 1: Send Photo to Admin Telegram Chat (Zero-Fail for Phone Gallery Save)
  const handleSendToTelegram = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSendingTg(true);

    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const res = await fetch(`${API_URL}/admin/send-qr-poster`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ image_base64: dataUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showNotification('Poster sent to your Telegram chat! Tap photo → Save to Gallery 🖼️');
        if (typeof WebApp !== 'undefined') {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showNotification(data.error || 'Failed to send to Telegram.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Network error.', 'error');
    } finally {
      setSendingTg(false);
    }
  };

  // Method 2: Native Download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          showNotification('Failed to generate image file.', 'error');
          setDownloading(false);
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ADWA_BINGO_QR_${botUsername.replace(/^@/, '')}.png`;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        showNotification('Download started! If on mobile, also use "Send to Telegram" or long-press the poster.');
        if (typeof WebApp !== 'undefined') {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
        setDownloading(false);
      }, 'image/png');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to download image.', 'error');
      setDownloading(false);
    }
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    const url = getFullTelegramUrl();
    navigator.clipboard.writeText(url).then(() => {
      showNotification('Telegram link copied!');
      if (typeof WebApp !== 'undefined') {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
    });
  };

  // Handle Open in Telegram
  const handleOpenLink = () => {
    const url = getFullTelegramUrl();
    if (typeof WebApp !== 'undefined') {
      WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="p-10 text-center font-bold text-slate-600">Access Denied!</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Toast Overlay */}
      {toast && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-black text-xs shadow-xl animate-fade-in ${
            toast.type === 'success' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800/90 backdrop-blur-md px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin"
            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 active:bg-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-black flex items-center gap-1.5 text-amber-400">
              <QrCode size={18} />
              <span>QR Poster Generator</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Canva-style High Resolution Marketing Poster</p>
          </div>
        </div>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            showOptions ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'
          }`}
          title="Customize Poster"
        >
          <Sliders size={15} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Customization Drawer */}
        {showOptions && (
          <div className="bg-slate-800 rounded-2xl p-4 border border-amber-500/30 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sliders size={13} />
                Customize Poster Content
              </span>
              <button
                onClick={() => {
                  setBotUsername('adwabingo_bot');
                  setRoomTitle('OFFICIAL ADWA BINGO');
                  setStartParam('qr');
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw size={10} /> Reset
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bot Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={botUsername.replace(/^@/, '')}
                    onChange={(e) => setBotUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                    placeholder="adwabingo_bot"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Header Subtitle</label>
                <input
                  type="text"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  placeholder="OFFICIAL ADWA BINGO"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Start Parameter (Optional Tracking/Agent Tag)
                </label>
                <input
                  type="text"
                  value={startParam}
                  onChange={(e) => setStartParam(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-amber-400"
                  placeholder="qr"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Scans will start: {getFullTelegramUrl()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Poster Preview */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40 bg-slate-950">
            {/* Real Image tag so mobile users can long-press to save directly to gallery */}
            {posterUrl ? (
              <img
                src={posterUrl}
                alt="ADWA BINGO QR Poster"
                className="w-full h-auto block select-none pointer-events-auto"
                style={{ aspectRatio: '2/3' }}
              />
            ) : null}

            {/* Hidden canvas for drawing and high-res export */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-amber-300/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <ImageIcon size={13} />
            <span>Mobile Tip: Tap & hold the poster to Save to Gallery!</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-sm mx-auto space-y-2 pt-1">
          {/* Method 1: Send Photo Directly to Telegram Chat (Guaranteed 1-Tap Save to Gallery) */}
          <button
            onClick={handleSendToTelegram}
            disabled={sendingTg}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            {sendingTg ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={18} />
            )}
            <span>{sendingTg ? 'Sending to Telegram...' : '📲 Send to My Telegram (Save to Gallery)'}</span>
          </button>

          {/* Method 2: Direct File Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <Download size={17} />
            <span>{downloading ? 'Preparing PNG...' : '📥 Download Poster (PNG)'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              <Copy size={14} />
              <span>Copy Bot Link</span>
            </button>

            <button
              onClick={handleOpenLink}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              <ExternalLink size={14} />
              <span>Test Bot Link</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="max-w-sm mx-auto bg-slate-800/60 rounded-xl p-3 border border-slate-800 flex items-start space-x-2.5">
          <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            This QR poster is generated in <strong className="text-slate-200">Ultra-HD print resolution (1200×1800)</strong>.
            Click <strong className="text-emerald-400">"Send to My Telegram"</strong> to receive the high-res photo directly in your chat with @adwabingo_bot, then tap <strong>Save to Gallery</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}

import { Nfc, Bluetooth, Usb, QrCode, Cpu } from 'lucide-react';
import { ScreenName } from '../App';

interface Props {
  onNavigate: (s: ScreenName) => void;
}

const apps: {
  name: ScreenName;
  label: string;
  icon: any;
  color: string;
  desc: string;
}[] = [
  { name: 'nfc',       label: 'NFC',        icon: Nfc,        color: '#4A9EFF', desc: 'Ler e gravar tags' },
  { name: 'bluetooth', label: 'Bluetooth',  icon: Bluetooth,  color: '#4A9EFF', desc: 'Scan BLE' },
  { name: 'badusb',    label: 'BadUSB',     icon: Usb,        color: '#FF3B3B', desc: 'Editor DuckyScript' },
  { name: 'qrcode',    label: 'QR Code',    icon: QrCode,     color: '#00FF88', desc: 'Scanner e gerador' },
];

export default function HomeScreen({ onNavigate }: Props) {
  return (
    <div className="home fade-in">
      <div className="home-header">
        <svg className="dolphin-logo" viewBox="0 0 100 100" fill="none">
          <path
            d="M20 60 Q15 40 35 35 Q50 32 65 40 L80 30 L78 45 Q85 50 85 60 Q80 70 65 70 L45 75 Q25 75 20 60 Z"
            fill="#FF8200"
            stroke="#FF8200"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="50" r="3" fill="#0A0A0A" />
          <path d="M70 55 Q75 58 80 55" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M30 65 L25 80 L35 70 Z" fill="#FF8200" />
          <path d="M50 35 Q55 25 60 30" stroke="#FFA040" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <h1 className="home-title">FlipperDIY</h1>
        <p className="home-subtitle">ARDUINO + PWA // v2.0</p>
      </div>

      <div className="app-grid">
        {apps.map(app => {
          const Icon = app.icon;
          return (
            <button
              key={app.name}
              className="app-tile"
              style={{ ['--tile-color' as any]: app.color }}
              onClick={() => onNavigate(app.name)}
            >
              <Icon />
              <span>{app.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Sobre o projeto</div>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          FlipperDIY v2.0 — versão PWA focada nas ferramentas nativas do celular.
          Todas as funções usam APIs web modernas (Web NFC, Web Bluetooth, câmera).
          O Arduino é opcional e serve como indicador de status.
        </p>
      </div>

      <div className="hint">
        <Cpu size={14} style={{ display: 'inline', marginRight: 6 }} />
        <strong>Dica:</strong> Para melhor experiência, instale o app na tela inicial
        (menu do Chrome → "Adicionar à tela inicial"). Funciona offline!
      </div>
    </div>
  );
}

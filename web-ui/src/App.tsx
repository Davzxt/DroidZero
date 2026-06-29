import { useState } from 'react';
import { Home, Usb, Settings, Nfc, Bluetooth, QrCode, Zap } from 'lucide-react';
import { useSerial } from './hooks/useSerial';
import HomeScreen from './components/HomeScreen';
import PhoneNFC from './components/PhoneNFC';
import BluetoothScreen from './components/Bluetooth';
import BadUSBScreen from './components/BadUSB';
import QRCodeScreen from './components/QRCode';
import SettingsScreen from './components/Settings';

export type ScreenName = 'home' | 'nfc' | 'bluetooth' | 'badusb' | 'qrcode' | 'settings';

export default function App() {
  const serial = useSerial();
  const [screen, setScreen] = useState<ScreenName>('home');

  return (
    <div className="app">
      <div className="status-bar">
        <div className="left">
          <span className={`dot ${serial.connected ? 'live' : ''}`}></span>
          <span className={`status-pill ${serial.connected ? 'ok' : 'warn'}`}>
            {serial.connected ? 'ARDUINO OK' : 'SEM ARDUINO'}
          </span>
        </div>
        <div className="right">
          <span className="status-pill">PWA</span>
          <span className="status-pill">v2.0</span>
        </div>
      </div>

      <div className="main">
        {screen === 'home'      && <HomeScreen onNavigate={setScreen} />}
        {screen === 'nfc'       && <PhoneNFC onBack={() => setScreen('home')} />}
        {screen === 'bluetooth' && <BluetoothScreen onBack={() => setScreen('home')} />}
        {screen === 'badusb'    && <BadUSBScreen onBack={() => setScreen('home')} />}
        {screen === 'qrcode'    && <QRCodeScreen onBack={() => setScreen('home')} />}
        {screen === 'settings'  && <SettingsScreen onBack={() => setScreen('home')} serial={serial} />}
      </div>

      <div className="bottom-nav">
        <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
          <Home /> Início
        </button>
        <button className={`nav-item ${['nfc','bluetooth','badusb','qrcode'].includes(screen) ? 'active' : ''}`} onClick={() => setScreen('home')}>
          <Zap /> Apps
        </button>
        <button className={`nav-item ${screen === 'settings' ? 'active' : ''}`} onClick={() => setScreen('settings')}>
          <Usb /> Conexão
        </button>
        <button className={`nav-item ${screen === 'settings' ? 'active' : ''}`} onClick={() => setScreen('settings')}>
          <Settings /> Ajustes
        </button>
      </div>
    </div>
  );
}

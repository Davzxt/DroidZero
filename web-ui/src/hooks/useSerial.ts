/**
 * useSerial - hook React que abstrai a comunicação com o Arduino via Web Serial API
 * Funciona no Chrome Android (e Chrome/Edge desktop para debug).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildCmd, parseSerialLine, SerialResponse, CmdName } from '../lib/protocol';

type PendingRequest = {
  cmd: string;
  resolve: (r: SerialResponse) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function useSerial() {
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const eventListenersRef = useRef<((e: SerialResponse) => void)[]>([]);
  const serialBufferRef = useRef<string>('');
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const readLoopActive = useRef(false);

  const addLog = useCallback((line: string, kind: 'in' | 'out' = 'in') => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [...prev.slice(-200), `${kind === 'out' ? '→' : '←'} [${ts}] ${line}`]);
  }, []);

  const dispatchLine = useCallback((line: string) => {
    addLog(line, 'in');
    const parsed = parseSerialLine(line);
    if (!parsed) return;

    if (parsed.type === 'EVT') {
      eventListenersRef.current.forEach(cb => cb(parsed));
      return;
    }

    const key = `${parsed.type}:${parsed.cmd}`;
    const pending = pendingRef.current.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      pendingRef.current.delete(key);
      pending.resolve(parsed);
    } else {
      eventListenersRef.current.forEach(cb => cb(parsed));
    }
  }, [addLog]);

  // Loop de leitura da porta serial
  const startReadLoop = useCallback(async () => {
    if (readLoopActive.current || !portRef.current) return;
    readLoopActive.current = true;

    const decoder = new TextDecoder();
    try {
      while (readLoopActive.current && portRef.current?.readable) {
        readerRef.current = portRef.current.readable.getReader();
        while (true) {
          const { done, value } = await readerRef.current.read();
          if (done) break;
          serialBufferRef.current += decoder.decode(value, { stream: true });
          while (true) {
            const nl = serialBufferRef.current.indexOf('\n');
            if (nl < 0) break;
            const l = serialBufferRef.current.substring(0, nl).trim();
            serialBufferRef.current = serialBufferRef.current.substring(nl + 1);
            if (l) dispatchLine(l);
          }
        }
        readerRef.current.releaseLock();
      }
    } catch (e) {
      console.error('Serial read error:', e);
    } finally {
      readLoopActive.current = false;
    }
  }, [dispatchLine]);

  // Conecta ao Arduino via Web Serial
  const connect = useCallback(async (): Promise<boolean> => {
    if (!('serial' in navigator)) {
      alert('Web Serial API não suportada. Use Chrome Android ou Edge.');
      return false;
    }
    try {
      // Pede para o usuário selecionar o Arduino
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setConnected(true);
      addLog('Conectado ao Arduino', 'in');
      startReadLoop();
      return true;
    } catch (e: any) {
      if (e.name !== 'NotFoundError') {
        console.error(e);
        alert(`Erro ao conectar: ${e.message}`);
      }
      return false;
    }
  }, [addLog, startReadLoop]);

  // Desconecta
  const disconnect = useCallback(async () => {
    readLoopActive.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (e) {
      console.error('Disconnect error:', e);
    }
    portRef.current = null;
    readerRef.current = null;
    setConnected(false);
    pendingRef.current.forEach(p => { clearTimeout(p.timer); p.reject(new Error('Disconnected')); });
    pendingRef.current.clear();
    addLog('Desconectado', 'in');
  }, [addLog]);

  // Envia comando
  const send = useCallback(async (
    name: CmdName,
    args: (string | number)[] = [],
    timeoutMs = 5000
  ): Promise<SerialResponse> => {
    const cmdStr = buildCmd(name, args);
    addLog(cmdStr, 'out');

    if (!connected || !portRef.current?.writable) {
      throw new Error('Arduino não conectado');
    }

    return new Promise<SerialResponse>((resolve, reject) => {
      const okKey = `OK:${name}`;
      const errKey = `ERR:${name}`;

      const timer = setTimeout(() => {
        pendingRef.current.delete(okKey);
        pendingRef.current.delete(errKey);
        reject(new Error(`Timeout aguardando resposta de ${name}`));
      }, timeoutMs);

      const handler: PendingRequest = { cmd: name, resolve, reject, timer };
      pendingRef.current.set(okKey, handler);
      pendingRef.current.set(errKey, handler);

      const encoder = new TextEncoder();
      const writer = portRef.current.writable.getWriter();
      writer.write(encoder.encode(cmdStr + '\n')).then(() => {
        writer.releaseLock();
      }).catch((e: any) => {
        clearTimeout(timer);
        pendingRef.current.delete(okKey);
        pendingRef.current.delete(errKey);
        reject(new Error(`Erro ao enviar: ${e.message}`));
      });
    });
  }, [connected, addLog]);

  // Subscribe a eventos
  const onEvent = useCallback((cb: (e: SerialResponse) => void) => {
    eventListenersRef.current.push(cb);
    return () => {
      eventListenersRef.current = eventListenersRef.current.filter(c => c !== cb);
    };
  }, []);

  const clearLog = useCallback(() => setLog([]), []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      readLoopActive.current = false;
      try { portRef.current?.close(); } catch {}
    };
  }, []);

  return {
    connected,
    log,
    send,
    onEvent,
    clearLog,
    connect,
    disconnect,
    hasWebSerial: typeof navigator !== 'undefined' && 'serial' in navigator,
  };
}

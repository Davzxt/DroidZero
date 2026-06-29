/**
 * Protocolo TypeScript - espelho do firmware Arduino v2.0
 *
 * Comunicação via Web Serial API (Chrome Android) ou bridge Android.
 */

export type SerialResponse =
  | { type: 'OK'; cmd: string; data: string }
  | { type: 'ERR'; cmd: string; msg: string }
  | { type: 'EVT'; kind: string; data: string };

export function parseSerialLine(line: string): SerialResponse | null {
  if (line.startsWith('OK:')) {
    const body = line.substring(3);
    const colon = body.indexOf(':');
    if (colon < 0) return { type: 'OK', cmd: body, data: '' };
    return { type: 'OK', cmd: body.substring(0, colon), data: body.substring(colon + 1) };
  }
  if (line.startsWith('ERR:')) {
    const body = line.substring(4);
    const colon = body.indexOf(':');
    if (colon < 0) return { type: 'ERR', cmd: body, msg: '' };
    return { type: 'ERR', cmd: body.substring(0, colon), msg: body.substring(colon + 1) };
  }
  if (line.startsWith('EVT:')) {
    const body = line.substring(4);
    const colon = body.indexOf(':');
    if (colon < 0) return { type: 'EVT', kind: body, data: '' };
    return { type: 'EVT', kind: body.substring(0, colon), data: body.substring(colon + 1) };
  }
  return null;
}

// Comandos suportados pelo firmware v2.0 (minimalista)
export const CMD = {
  PING: 'PING',
  IDENTIFY: 'ID',
  LED_ON: 'LED_ON',
  LED_OFF: 'LED_OFF',
  LED_BLINK: 'LED_BLINK',
} as const;

export type CmdName = typeof CMD[keyof typeof CMD];

export function buildCmd(name: CmdName, args: (string | number)[] = []): string {
  if (args.length === 0) return `CMD:${name}`;
  return `CMD:${name}:${args.join(',')}`;
}

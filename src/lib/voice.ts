// Browser calling with Twilio's Voice SDK. The server decides the caller ID and whether a lead may be called.
import { Call, Device } from '@twilio/voice-sdk';
import { authHeaders } from './firebase';

let device: Device | null = null;
let starting: Promise<Device> | null = null;
let incomingHandler: ((call: Call) => void) | null = null;

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/telephony/token', { headers: authHeaders(false) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || `Couldn’t start calling (error ${res.status}).`);
  return body.token as string;
}

/** Creates the Device once. `register` lets the browser receive calls to your numbers. */
export function getDevice(register = false): Promise<Device> {
  if (device) {
    if (register && device.state === Device.State.Unregistered) device.register().catch(() => {});
    return Promise.resolve(device);
  }
  if (!starting) {
    starting = (async () => {
      const d = new Device(await fetchToken(), {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: 'A call is in progress. Leave anyway?',
      });
      d.on('tokenWillExpire', async () => {
        try { d.updateToken(await fetchToken()); } catch (e) { console.warn('[Voice] token refresh failed', e); }
      });
      d.on('incoming', (call: Call) => incomingHandler?.(call));
      d.on('error', (e: { message?: string }) => console.warn('[Voice] device error', e?.message));
      if (register) await d.register().catch(e => console.warn('[Voice] register failed', e));
      device = d;
      return d;
    })().finally(() => { starting = null; });
  }
  return starting;
}

export function onIncomingCall(handler: ((call: Call) => void) | null) {
  incomingHandler = handler;
}

/** Places a browser call. The server looks the lead up by id and applies every calling rule. */
export async function connectToLead(leadId: string, phone: string): Promise<Call> {
  const d = await getDevice();
  return d.connect({ params: { To: phone, leadId } });
}

export function destroyDevice() {
  device?.destroy();
  device = null;
}

export type { Call };

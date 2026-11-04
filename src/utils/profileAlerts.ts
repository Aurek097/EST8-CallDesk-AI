import { AgentProfile } from '../types';
import { parseDate, fmtD, startOfDay } from './calculations';
import { stName } from '../constants/data';

export type AlertType = 'warn' | 'bad';

export interface CredAlert {
  type: AlertType;
  message: string;
}

export function credAlerts(p: AgentProfile): CredAlert[] {
  const out: CredAlert[] = [];
  const today = new Date();

  const chk = (label: string, d?: string) => {
    const x = parseDate(d);
    if (!x) return;
    const days = Math.round((startOfDay(x).getTime() - startOfDay(today).getTime()) / 864e5);
    if (days < 0) {
      out.push({ type: 'bad', message: `${label} expired on ${fmtD(x)}.` });
    } else if (days <= 60) {
      out.push({
        type: 'warn',
        message: `${label} expires in ${days} day${days === 1 ? '' : 's'} (${fmtD(x)}).`
      });
    }
  };

  chk('E&O coverage', p.eoExp);

  (p.states || []).forEach(s => {
    chk(`${stName(s.st) || 'State'} license`, s.exp);
  });

  if (!(p.states || []).length) {
    out.push({
      type: 'warn',
      message: 'No licensed states added. The final expense compliance check needs your licensed states.'
    });
  }

  return out;
}

import React from 'react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { VerifyChip } from './VerifyChip';
import { resolveTokens } from '../utils/calculations';

interface FormattedScriptTextProps {
  text: string;
  lead: Lead;
  className?: string;
}

export const FormattedScriptText: React.FC<FormattedScriptTextProps> = ({
  text,
  lead,
  className = ''
}) => {
  const { profile, settings } = useApp();

  // First split by verify chips: [[v:fieldName]]
  const parts = text.split(/(\[\[v:\w+\]\])/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        const vMatch = part.match(/^\[\[v:(\w+)\]\]$/);
        if (vMatch) {
          return <VerifyChip key={idx} field={vMatch[1]} lead={lead} />;
        }

        // Now parse tokens inside this chunk: {{tokenName}}
        const subParts = part.split(/(\{\{\w+\}\})/g);
        return (
          <React.Fragment key={idx}>
            {subParts.map((subPart, sIdx) => {
              const tMatch = subPart.match(/^\{\{(\w+)\}\}$/);
              if (tMatch) {
                const tokenKey = tMatch[1];
                const resolved = resolveTokens(`{{${tokenKey}}}`, lead, profile, settings);
                const isPlaceholder = resolved.startsWith('[') && resolved.endsWith(']');

                return (
                  <span
                    key={sIdx}
                    className={`inline-block px-1 py-0.2 rounded font-semibold tabular-nums ${
                      isPlaceholder
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-normal italic border-b border-dashed border-amber-400'
                        : 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200'
                    }`}
                  >
                    {resolved}
                  </span>
                );
              }
              return subPart;
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
};

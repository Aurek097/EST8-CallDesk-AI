import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  parseFile,
  parseDelim,
  guessColumn,
  MAP_OPTS,
  rowToLead,
  digits
} from '../utils/importer';
import { fullName } from '../utils/calculations';
import { Lead } from '../types';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const ImportModal: React.FC = () => {
  const { isImportOpen, setIsImportOpen, importLeads, leads } = useApp();

  const [leadType, setLeadType] = useState<'auto' | 'fe' | 'mp'>('auto');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [head, setHead] = useState<string[]>([]);
  const [body, setBody] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isImportOpen) return null;

  const processRows = (rows: string[][], name = '') => {
    if (!rows || rows.length < 2) {
      setMsg({ text: 'Need a header row plus at least one lead row.', isError: true });
      return;
    }
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);
    const guessedMap = headers.map(guessColumn);

    setHead(headers);
    setBody(dataRows);
    setColumnMap(guessedMap);
    setFileName(name);
    setMsg({
      text: `Found ${dataRows.length} row${dataRows.length === 1 ? '' : 's'} and ${headers.length} columns.`
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setMsg({ text: `Reading ${file.name}...` });
    try {
      const rows = await parseFile(file);
      processRows(rows, file.name);
    } catch (err) {
      setMsg({ text: "Couldn't read that file. Try saving it as CSV or pasting rows directly.", isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReadPaste = () => {
    if (!pasteText.trim()) {
      setMsg({ text: 'Paste rows from your spreadsheet first.', isError: true });
      return;
    }
    const rows = parseDelim(pasteText);
    processRows(rows, 'Pasted table');
  };

  const handleColumnChange = (index: number, mappedValue: string) => {
    setColumnMap(prev => {
      const next = [...prev];
      next[index] = mappedValue;
      return next;
    });
  };

  const handleExecuteImport = () => {
    if (!body.length) return;
    let addedCount = 0;
    let dupCount = 0;
    const fresh: Lead[] = [];

    for (const r of body) {
      const newLead = rowToLead(head, columnMap, r, leadType);
      if (!newLead.firstName && !newLead.lastName && !newLead.phone) continue;

      const newPhoneDigits = digits(newLead.phone);
      const isDup = leads.concat(fresh).some(existing => {
        const existingDigits = digits(existing.phone);
        if (newPhoneDigits && existingDigits && newPhoneDigits === existingDigits) return true;
        if (
          fullName(existing) === fullName(newLead) &&
          existing.address &&
          existing.address === newLead.address
        ) {
          return true;
        }
        return false;
      });

      if (isDup) {
        dupCount++;
        continue;
      }

      newLead.log = [
        {
          t: Date.now(),
          k: 'stage',
          x: `Imported as ${newLead.type === 'fe' ? 'final expense' : 'mortgage protection'} lead`
        }
      ];
      fresh.push(newLead);
      addedCount++;
    }

    importLeads(fresh);
    setMsg({
      text: `Added ${addedCount} lead${addedCount === 1 ? '' : 's'}${
        dupCount ? `, skipped ${dupCount} duplicates` : ''
      }!`
    });

    setTimeout(() => {
      setIsImportOpen(false);
      setHead([]);
      setBody([]);
      setPasteText('');
      setMsg(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--rule)]">
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--ink)]">
              Import Leads Spreadsheet
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Drop a CSV, TSV or Excel file (.xlsx), or copy rows directly from Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsImportOpen(false)}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead type selection */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-[var(--muted)]">Lead Type:</span>
          <select
            value={leadType}
            onChange={e => setLeadType(e.target.value as any)}
            className="p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] font-medium"
          >
            <option value="auto">Detect from the sheet</option>
            <option value="fe">Final expense</option>
            <option value="mp">Mortgage protection</option>
          </select>
        </div>

        {/* File drop zone */}
        <label className="block border-2 border-dashed border-[var(--rule)] hover:border-[var(--accent)] rounded-xl p-6 text-center cursor-pointer transition-all bg-[var(--surface-2)]/50 hover:bg-[var(--accent-soft)]/30">
          <Upload className="w-6 h-6 text-[var(--muted)] mx-auto mb-2" />
          <span className="text-xs font-semibold text-[var(--ink)] block">
            {fileName ? `Loaded: ${fileName}` : 'Drop a .csv, .tsv or .xlsx file here, or choose file'}
          </span>
          <span className="text-[11px] text-[var(--muted)] block mt-0.5">
            Accepts vendor lead files (GOAT Leads, Meta, standard CRM exports)
          </span>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Paste area */}
        <div className="space-y-2">
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={3}
            placeholder="...or paste rows directly here (first row = column headers)"
            className="w-full p-2.5 rounded-xl border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] font-mono outline-hidden focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between">
            {msg && (
              <span
                className={`text-xs font-medium flex items-center gap-1 ${
                  msg.isError ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {msg.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{msg.text}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleReadPaste}
              className="ml-auto px-3 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-xs font-semibold hover:border-[var(--accent)]"
            >
              Read pasted rows
            </button>
          </div>
        </div>

        {/* Column Mapping Table */}
        {head.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--rule)]">
            <div className="text-xs font-semibold text-[var(--ink)]">
              Confirm Column Mapping ({body.length} rows detected)
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Any column set to "Keep as extra" will still be shown under "Extra Sheet Columns" on the lead card.
            </p>

            <div className="max-h-60 overflow-y-auto border border-[var(--rule)] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--surface-2)] sticky top-0 border-b border-[var(--rule)]">
                  <tr>
                    <th className="p-2.5 font-semibold text-[var(--muted)]">Sheet Column</th>
                    <th className="p-2.5 font-semibold text-[var(--muted)]">Maps to CallDesk Field</th>
                    <th className="p-2.5 font-semibold text-[var(--muted)]">Example Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rule)]">
                  {head.map((colName, idx) => (
                    <tr key={idx} className="hover:bg-[var(--surface-2)]">
                      <td className="p-2.5 font-medium text-[var(--ink)]">{colName || '(blank)'}</td>
                      <td className="p-2">
                        <select
                          value={columnMap[idx] || ''}
                          onChange={e => handleColumnChange(idx, e.target.value)}
                          className="p-1 rounded-md border border-[var(--rule)] bg-[var(--surface)] text-xs text-[var(--ink)] max-w-[200px]"
                        >
                          {MAP_OPTS.map(([optVal, optLabel]) => (
                            <option key={optVal} value={optVal}>
                              {optLabel}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-[var(--muted)] truncate max-w-[180px] font-mono text-[11px]">
                        {body.find(r => Boolean(r[idx]))?.[idx] || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--rule)]">
          <button
            type="button"
            onClick={() => setIsImportOpen(false)}
            className="px-4 py-2 rounded-lg border border-[var(--rule)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={body.length === 0 || isProcessing}
            className="px-4 py-2 rounded-lg bg-[var(--action)] text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
          >
            Add {body.length} Lead{body.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};

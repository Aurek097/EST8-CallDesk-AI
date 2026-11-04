import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  PhoneCall,
  Search,
  ShoppingCart,
  CheckCircle,
  Hash,
  ShieldCheck,
  Trash2,
  Star,
  MapPin,
  MessageSquare,
  Sparkles,
  X,
  Loader2
} from 'lucide-react';
import { UserPhoneNumber } from '../types';

export const NumberMarketplaceModal: React.FC = () => {
  const {
    isNumberMarketplaceOpen,
    setIsNumberMarketplaceOpen,
    phoneNumbers,
    buyPhoneNumber,
    setPrimaryNumber,
    releasePhoneNumber,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'search' | 'my-numbers'>('search');
  const [areaCode, setAreaCode] = useState('803');
  const [stateCode, setStateCode] = useState('SC');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [purchasingNumber, setPurchasingNumber] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search available numbers
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/telephony/numbers/search?areaCode=${encodeURIComponent(areaCode)}&state=${encodeURIComponent(stateCode)}`, {
        headers: {
          'x-user-email': user?.email || ''
        }
      });
      const data = await res.json();
      if (Array.isArray(data.numbers)) {
        setSearchResults(data.numbers);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to search available numbers from carrier.' });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isNumberMarketplaceOpen && searchResults.length === 0) {
      handleSearch();
    }
  }, [isNumberMarketplaceOpen]);

  const handleBuy = async (num: any) => {
    setPurchasingNumber(num.phoneNumber);
    setStatusMessage(null);
    try {
      await buyPhoneNumber(num.phoneNumber, `${num.friendlyName} (${num.locality}, ${num.region})`);
      setStatusMessage({ type: 'success', text: `Successfully purchased ${num.friendlyName}! Assigned as your active caller ID.` });
      // Remove from search results
      setSearchResults(prev => prev.filter(n => n.phoneNumber !== num.phoneNumber));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to purchase number' });
    } finally {
      setPurchasingNumber(null);
    }
  };

  if (!isNumberMarketplaceOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">Phone Number Marketplace</h2>
              <p className="text-xs text-slate-400">Search and buy dedicated local area-code caller IDs for voice & SMS</p>
            </div>
          </div>
          <button
            onClick={() => setIsNumberMarketplaceOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'search'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Search & Buy Numbers
          </button>
          <button
            onClick={() => setActiveTab('my-numbers')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'my-numbers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>My Active Numbers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono font-bold">
              {phoneNumbers.length}
            </span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs hover:underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="Area Code (e.g. 803)"
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-32 border-l border-slate-800 pl-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="State (SC)"
                    value={stateCode}
                    onChange={e => setStateCode(e.target.value.toUpperCase())}
                    className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none uppercase"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search Inventory</span>
                </button>
              </form>

              {/* Number Listings */}
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Available Local Inventory ({searchResults.length} numbers)</span>
                  <span className="text-[11px] text-slate-500">Twilio Carrier Tier 1 Network</span>
                </div>

                {isSearching ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span>Searching telecom inventory...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((num: any) => (
                      <div
                        key={num.phoneNumber}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-100 text-base">{num.friendlyName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{num.locality}, {num.region}</span>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {num.monthlyCost || '$1.15/mo'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">VOICE</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">SMS</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">MMS</span>
                          </div>

                          <button
                            onClick={() => handleBuy(num)}
                            disabled={purchasingNumber === num.phoneNumber}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            {purchasingNumber === num.phoneNumber ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-3.5 h-3.5" />
                            )}
                            <span>Buy Number</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* My Active Numbers Tab */
            <div className="space-y-3">
              {phoneNumbers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <PhoneCall className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No Phone Numbers Purchased Yet</p>
                  <p className="text-slate-500 mt-1">Search an area code above to provision your first outbound dialer number.</p>
                </div>
              ) : (
                phoneNumbers.map((num: UserPhoneNumber) => (
                  <div
                    key={num.id}
                    className={`bg-slate-950 border rounded-xl p-4 flex items-center justify-between gap-4 transition ${
                      num.isPrimary ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          num.isPrimary ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Hash className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-100 text-sm">{num.phoneNumber}</span>
                          {num.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-emerald-400" /> Primary Caller ID
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">{num.friendlyName}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!num.isPrimary && (
                        <button
                          onClick={() => setPrimaryNumber(num.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        >
                          Make Primary
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to release ${num.phoneNumber}? You will no longer own this number.`)) {
                            releasePhoneNumber(num.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                        title="Release number"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>STIR/SHAKEN Attestation A & 10DLC A2P Compliant</span>
          </div>
          <button
            onClick={() => setIsNumberMarketplaceOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

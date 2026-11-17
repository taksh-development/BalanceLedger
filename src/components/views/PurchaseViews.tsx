import React, { useState } from 'react';
import { EditionMode, LedgerState } from '../../types/ledger';
import { fmt, getCurrencyConfig, r2 } from '../../utils/ledgerUtils';

interface WishesViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddWish: (name: string, price: number, category: string) => void;
  onBuyWish: (id: string) => void;
  onDeleteWish: (id: string) => void;
}

export const WishesView: React.FC<WishesViewProps> = ({
  edition,
  state,
  onAddWish,
  onBuyWish,
  onDeleteWish,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(isAdults ? 'Equipment' : 'Toys & Games');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const avail = r2(state.wallet + state.saved);
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(price));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;
    onAddWish(name.trim(), num, category);
    setName('');
    setPrice('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Add Planned Purchase' : 'Add Wishlist Item'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Item Description
            </label>
            <input
              type="text"
              required
              placeholder={isAdults ? 'e.g., Office Chair, Monitor' : 'e.g., LEGO Set, Headphones'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Estimated Cost ({sym})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="25.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              >
                {isAdults ? (
                  <>
                    <option value="Equipment">Equipment</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Home & Office">Home &amp; Office</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Toys & Games">Toys &amp; Games</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Art & Books">Art &amp; Books</option>
                    <option value="Sports & Gear">Sports &amp; Gear</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className={`w-full border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isAdults ? 'Add Planned Purchase' : 'Add to Wishlist'}
          </button>
        </form>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Target Purchases' : 'What I Wanna Buy'}
          </h2>
        </div>

        {state.wishes.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No planned purchases listed.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.wishes.map((w) => {
              const pct = Math.min(100, Math.round((avail / w.price) * 100));
              const canBuy = avail >= w.price;
              return (
                <div key={w.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {w.name}{' '}
                        <span className="font-normal text-neutral-500 dark:text-neutral-400">
                          · {w.category}
                        </span>
                      </div>
                      <div className="font-num mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        Cost: {fmt(w.price, cur)} ·{' '}
                        {canBuy
                          ? 'Sufficient funds available'
                          : `Shortfall: ${fmt(w.price - avail, cur)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canBuy && (
                        <button
                          type="button"
                          onClick={() => onBuyWish(w.id)}
                          className={`bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 ${
                            isAdults ? 'rounded-none' : 'rounded-lg'
                          }`}
                        >
                          Purchase
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteWish(w.id)}
                        className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${
                          isAdults ? 'rounded-none' : 'rounded-lg'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div
                    className={`mt-2 h-2 w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 ${
                      isAdults ? 'rounded-none' : 'rounded-full'
                    }`}
                  >
                    <div
                      className={`h-full ${
                        canBuy
                          ? 'bg-emerald-700'
                          : isAdults
                          ? 'bg-neutral-900 dark:bg-white'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface PauseViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddPaused: (name: string, price: number) => void;
  onSkipPaused: (id: string) => void;
  onBuyPaused: (id: string) => string | null;
}

export const PauseView: React.FC<PauseViewProps> = ({
  edition,
  state,
  onAddPaused,
  onSkipPaused,
  onBuyPaused,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(price));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;
    onAddPaused(name.trim(), num);
    setName('');
    setPrice('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? '72-Hour Cooling-Off Queue' : '72-Hour Wait Shelf'}
          </h2>
        </div>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          Log discretionary purchases here for 72 hours before committing funds. Decline items to track avoided spend.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Item Considered
            </label>
            <input
              type="text"
              required
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Price ({sym})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <button
            type="submit"
            className={`w-full border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-slate-900 bg-slate-900 text-white hover:bg-slate-800 dark:bg-indigo-600'
            }`}
          >
            Hold in Review Queue
          </button>
        </form>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            Items Under Review
          </h2>
          <span className="font-num text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Avoided Spend: {fmt(state.skippedTotal, cur)}
          </span>
        </div>

        {error && <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}

        {state.paused.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No items under review.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.paused.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {p.name}
                  </div>
                  <div className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                    {fmt(p.price, cur)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSkipPaused(p.id)}
                    className={`border px-2.5 py-1 text-xs font-semibold ${
                      isAdults
                        ? 'rounded-none border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-400'
                        : 'rounded-lg border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    Decline Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      const err = onBuyPaused(p.id);
                      if (err) setError(err);
                    }}
                    className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${
                      isAdults ? 'rounded-none' : 'rounded-lg'
                    }`}
                  >
                    Proceed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const CountdownView: React.FC<{ edition: EditionMode; state: LedgerState }> = ({
  edition,
  state,
}) => {
  const isAdults = edition === 'adults';
  const cur = state.currency;
  const avail = r2(state.wallet + state.saved);

  return (
    <div
      className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
        isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
        <h2 className="text-base font-bold text-neutral-950 dark:text-white">
          {isAdults ? 'Income Funding Timeline' : 'Allowance Countdown'}
        </h2>
        <span className="font-num text-xs font-semibold text-neutral-900 dark:text-neutral-200">
          Rate: {fmt(state.allowance, cur)} / week
        </span>
      </div>

      {state.wishes.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Add planned purchases to calculate funding timeline.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {state.wishes.map((w) => {
            const need = Math.max(0, r2(w.price - avail));
            const weeks = state.allowance > 0 ? Math.ceil(need / state.allowance) : null;
            return (
              <div key={w.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {w.name}{' '}
                    <span className="font-num text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      ({fmt(w.price, cur)})
                    </span>
                  </div>
                  <div className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                    {need <= 0 ? 'Target funded' : `Remaining required: ${fmt(need, cur)}`}
                  </div>
                </div>
                <span
                  className={`font-num text-xs font-semibold ${
                    need <= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {need <= 0 ? '0 weeks' : `${weeks ?? '--'} week(s)`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface BoughtViewProps {
  edition: EditionMode;
  state: LedgerState;
  onLogPurchase: (payload: {
    name: string;
    price: number;
    source: 'wallet' | 'saved';
    category: string;
  }) => string | null;
}

export const BoughtView: React.FC<BoughtViewProps> = ({
  edition,
  state,
  onLogPurchase,
}) => {
  const isAdults = edition === 'adults';
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [source, setSource] = useState<'wallet' | 'saved'>('wallet');
  const [category, setCategory] = useState(
    isAdults ? 'Groceries & Dining' : 'Toys & Games'
  );
  const [error, setError] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const num = r2(parseFloat(price));
    if (!name.trim() || Number.isNaN(num) || num <= 0) return;
    const err = onLogPurchase({ name: name.trim(), price: num, source, category });
    if (err) {
      setError(err);
      return;
    }
    setName('');
    setPrice('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Log Expense / Purchase' : 'Log Something Bought'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Description
            </label>
            <input
              type="text"
              required
              placeholder={isAdults ? 'Merchant or item description' : 'What did you buy?'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Amount Paid ({sym})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Funding Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as 'wallet' | 'saved')}
                className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              >
                <option value="wallet">{isAdults ? 'Checking / Liquid Cash' : 'My Wallet'}</option>
                <option value="saved">{isAdults ? 'Savings & Reserve' : 'Piggy Bank'}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
            >
              {isAdults ? (
                <>
                  <option value="Groceries & Dining">Groceries &amp; Dining</option>
                  <option value="Housing & Utilities">Housing &amp; Utilities</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Subscriptions & Bills">Subscriptions &amp; Bills</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Other">Other</option>
                </>
              ) : (
                <>
                  <option value="Toys & Games">Toys &amp; Games</option>
                  <option value="Snacks & Treats">Snacks &amp; Treats</option>
                  <option value="Art & Books">Art &amp; Books</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Other">Other</option>
                </>
              )}
            </select>
          </div>
          {error && <p className="text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            className={`w-full border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Record Expense
          </button>
        </form>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Expense History' : 'What I Bought (Purchase History)'}
          </h2>
        </div>

        {state.bought.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.bought.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {b.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{b.category}</span>
                    {b.placeName && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {b.placeName}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true"> · </span>
                    <span className="font-num">{b.date}</span>
                  </div>
                </div>
                <span className="font-num text-sm font-semibold text-red-700 dark:text-red-400">
                  {fmt(b.price, cur)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface IOUViewProps {
  edition: EditionMode;
  state: LedgerState;
  onAddIOU: (payload: {
    type: 'owedToMe' | 'iOwe';
    person: string;
    amt: number;
    reason: string;
  }) => void;
  onSettleIOU: (id: string) => string | null;
}

export const IOUView: React.FC<IOUViewProps> = ({
  edition,
  state,
  onAddIOU,
  onSettleIOU,
}) => {
  const isAdults = edition === 'adults';
  const [type, setType] = useState<'owedToMe' | 'iOwe'>('owedToMe');
  const [person, setPerson] = useState('');
  const [amt, setAmt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = r2(parseFloat(amt));
    if (!person.trim() || !reason.trim() || Number.isNaN(num) || num <= 0) return;
    onAddIOU({ type, person: person.trim(), amt: num, reason: reason.trim() });
    setPerson('');
    setAmt('');
    setReason('');
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            {isAdults ? 'Receivables & Payables (IOUs)' : 'Borrowed & Lent (IOUs)'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Direction
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'owedToMe' | 'iOwe')}
                className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              >
                <option value="owedToMe">Owed to Me (Receivable)</option>
                <option value="iOwe">I Owe Counterparty (Payable)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Counterparty Name
              </label>
              <input
                type="text"
                required
                placeholder="Name"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Amount ({sym})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                className={`font-num w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Note
              </label>
              <input
                type="text"
                required
                placeholder="Purpose"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white ${radius}`}
              />
            </div>
          </div>
          <button
            type="submit"
            className={`w-full border px-4 py-2 text-sm font-semibold ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Record IOU
          </button>
        </form>
      </div>

      <div
        className={`border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${
          isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
        }`}
      >
        <div className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-950 dark:text-white">
            Active IOUs
          </h2>
        </div>

        {error && <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-400">{error}</p>}

        {state.ious.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No active IOUs.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {state.ious.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {i.type === 'owedToMe' ? `${i.person} owes you` : `You owe ${i.person}`}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{i.reason}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-num text-sm font-semibold ${
                      i.type === 'owedToMe'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {fmt(i.amt, cur)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      const err = onSettleIOU(i.id);
                      if (err) setError(err);
                    }}
                    className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${
                      isAdults ? 'rounded-none' : 'rounded-lg'
                    }`}
                  >
                    Mark Settled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';

function LNbitsApp() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState(100);
  const [invoiceMemo, setInvoiceMemo] = useState('');
  const [currentInvoice, setCurrentInvoice] = useState(null);

  const API_URL = 'http://localhost:5000/api/v1';

  useEffect(() => {
    // Only fetch wallets if an API key is provided
    if (apiKey) {
      fetchWallets();
    }
  }, [apiKey]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      console.log('Attempting to fetch with key:', apiKey); // For debugging
      const response = await fetch(`${API_URL}/wallet`, { // Note: changed from /wallets to /wallet
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Response status:', response.status);
        throw new Error(`Error fetching wallets: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Wallet data:', data);
      setWallets(Array.isArray(data) ? data : [data]);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch wallets: ${err.message}`);
      setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/wallets`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWalletName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error creating wallet: ${response.status}`);
      }

      const newWallet = await response.json();
      setWallets([...wallets, newWallet]);
      setNewWalletName('');
      setError(null);
    } catch (err) {
      setError(`Failed to create wallet: ${err.message}`);
    }
  };

  const createInvoice = async (walletId, inkey) => {
    if (invoiceAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'X-Api-Key': inkey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: invoiceAmount,
          memo: invoiceMemo || `Invoice from ${walletId}`,
          out: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error creating invoice: ${response.status}`);
      }

      const invoice = await response.json();
      setCurrentInvoice(invoice);
      setError(null);
    } catch (err) {
      setError(`Failed to create invoice: ${err.message}`);
    }
  };

  const payInvoice = async (walletAdminKey, bolt11) => {
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'X-Api-Key': walletAdminKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          out: true,
          bolt11: bolt11,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error paying invoice: ${response.status}`);
      }

      await response.json();
      setCurrentInvoice(null);
      fetchWallets(); // Refresh wallets to update balances
      setError(null);
    } catch (err) {
      setError(`Failed to pay invoice: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">LNbits Signet Wallet Manager</h1>
      
      {/* API Key Input */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">API Connection</h2>
        <div className="flex mb-4">
          <input
            type="password"
            className="flex-grow p-2 border rounded mr-2"
            placeholder="Enter your LNbits Admin Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={fetchWallets}
          >
            Connect
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Note: For development only. Never expose API keys in production code.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Wallet Creation */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Create New Wallet</h2>
        <form onSubmit={createWallet} className="flex mb-4">
          <input
            type="text"
            className="flex-grow p-2 border rounded mr-2"
            placeholder="Wallet Name"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            disabled={!apiKey}
          />
          <button 
            type="submit" 
            className="bg-green-500 text-white px-4 py-2 rounded"
            disabled={!apiKey}
          >
            Create Wallet
          </button>
        </form>
      </div>

      {/* Wallet List */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Your Wallets</h2>
        {loading ? (
          <p>Loading wallets...</p>
        ) : wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="border rounded p-4">
                <h3 className="font-bold">{wallet.name}</h3>
                <p>Balance: {wallet.balance_msat / 1000} sats</p>
                <p className="text-sm truncate">ID: {wallet.id}</p>
                <div className="mt-2">
                  <input
                    type="number"
                    className="p-2 border rounded mr-2 w-24"
                    placeholder="Amount"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                  />
                  <input
                    type="text"
                    className="p-2 border rounded mr-2"
                    placeholder="Memo (optional)"
                    value={invoiceMemo}
                    onChange={(e) => setInvoiceMemo(e.target.value)}
                  />
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded mr-2 mt-2"
                    onClick={() => createInvoice(wallet.id, wallet.inkey)}
                  >
                    Create Invoice
                  </button>
                  {currentInvoice && (
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded mt-2"
                      onClick={() => payInvoice(wallet.adminkey, currentInvoice.bolt11)}
                    >
                      Pay Current Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : apiKey ? (
          <p>No wallets found. Create one above!</p>
        ) : (
          <p>Enter your API key to view wallets</p>
        )}
      </div>

      {/* Invoice Display */}
      {currentInvoice && (
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Current Invoice</h2>
          <p className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
            {currentInvoice.bolt11}
          </p>
          <p className="mt-2">Amount: {currentInvoice.amount} sats</p>
          {currentInvoice.memo && <p>Memo: {currentInvoice.memo}</p>}
        </div>
      )}
    </div>
  );
}

export default LNbitsApp;
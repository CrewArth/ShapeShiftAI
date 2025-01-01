'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Credits from '@/components/Credits';
import ModelViewer from '@/components/ModelViewer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Clock, Box, CreditCard, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import '../history.css';
import { Card } from '@/components/ui/card';
import DownloadReceiptButton from '@/app/history/DownloadReceiptButton';
import Image from 'next/image';
import { toast } from 'sonner';

type ModelHistory = {
  id: string;
  type: 'text-to-3d' | 'image-to-3d';
  prompt?: string;
  negative_prompt?: string;
  art_style?: string;
  thumbnail_url?: string;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    mtl?: string;
    usdz?: string;
  };
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  created_at: number;
  finished_at?: number;
  task_error?: {
    message: string;
  };
  credits: number;
};

type Transaction = {
  id: string;
  type: 'subscription' | 'topup' | 'usage';
  amount?: number;
  credits: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  stripePaymentId?: string;
  stripeSessionId?: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
};

interface HistoryClientProps {}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

const HistoryClient: React.FC<HistoryClientProps> = () => {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'models' | 'transactions'>('models');
  const [models, setModels] = useState<ModelHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelsPagination, setModelsPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false
  });
  const [transactionsPagination, setTransactionsPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false
  });

  const fetchModels = async (page = 1) => {
    try {
      const modelResponse = await fetch(`/api/history/models?page=${page}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!modelResponse.ok) {
        const errorData = await modelResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch models');
      }
      const data = await modelResponse.json();
      return {
        models: data.models || [],
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      const response = await fetch(`/api/history/transactions?page=${page}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      const data = await response.json();
      return {
        transactions: data.transactions.filter((t: Transaction) => t.type === 'topup' && t.status === 'success'),
        pagination: data.pagination
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const loadMore = async () => {
    try {
      setLoading(true);
      if (activeTab === 'models') {
        const nextPage = modelsPagination.currentPage + 1;
        const { models: newModels, pagination } = await fetchModels(nextPage);
        setModels(prev => [...prev, ...newModels]);
        setModelsPagination(pagination);
      } else {
        const nextPage = transactionsPagination.currentPage + 1;
        const { transactions: newTransactions, pagination } = await fetchTransactions(nextPage);
        setTransactions(prev => [...prev, ...newTransactions]);
        setTransactionsPagination(pagination);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more items';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [modelsData, transactionsData] = await Promise.all([
          fetchModels(1),
          fetchTransactions(1)
        ]);

        setModels(modelsData.models);
        setModelsPagination(modelsData.pagination);
        setTransactions(transactionsData.transactions);
        setTransactionsPagination(transactionsData.pagination);
      } catch (error) {
        console.error('Error fetching history:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load history';
        setError(errorMessage);
        toast.error(errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => fetchInitialData(),
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isLoaded]);

  // Show loading state while auth is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = () => {
    const currentPagination = activeTab === 'models' ? modelsPagination : transactionsPagination;

    if (activeTab === 'models') {
      if (models.length === 0) {
        return (
          <div className="empty-state">
            <Box className="w-12 h-12 mb-4 text-[var(--foreground-secondary)]" />
            <p className="empty-text">No models generated yet</p>
          </div>
        );
      }

      return (
        <div className="space-y-4 max-w-4xl mx-auto px-4">
          <div className="grid gap-4">
            {models.map((model) => (
              <Card key={model.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    {model.thumbnail_url && (
                      <div className="w-24 h-24 relative rounded-lg overflow-hidden bg-[var(--background-secondary)] flex-shrink-0">
                        <Image
                          src={model.thumbnail_url}
                          alt="Model thumbnail"
                          fill
                          className="object-cover object-center"
                          sizes="96px"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">
                        {model.type === 'text-to-3d' ? 'Text to 3D' : 'Image to 3D'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(model.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {model.prompt && (
                        <p className="mt-2 text-sm">Prompt: {model.prompt}</p>
                      )}
                      {model.task_error && (
                        <p className="mt-2 text-sm text-red-500">{model.task_error.message}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(model.status)}`}>
                    {model.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          {currentPagination?.hasMore && !loading && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      );
    }

    // Transactions tab content
    if (transactions.length === 0) {
      return (
        <div className="empty-state">
          <CreditCard className="w-12 h-12 mb-4 text-[var(--foreground-secondary)]" />
          <p className="empty-text">No transactions yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-4xl mx-auto px-4">
        <div className="grid gap-4">
          {transactions.map((transaction) => (
            <Card key={transaction.id || transaction.razorpayPaymentId} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="w-5 h-5 text-[var(--foreground-secondary)]" />
                    <h3 className="text-lg font-semibold">
                      ₹{((transaction.amount || 0) / 100).toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--foreground-secondary)] mb-1">
                    {format(new Date(transaction.timestamp), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-sm text-[var(--foreground-secondary)] mb-3">
                    Credits Added: {transaction.credits}
                  </p>
                  <div className="text-xs text-[var(--foreground-secondary)] font-mono bg-[var(--background-secondary)] p-2 rounded-md">
                    Order ID: {transaction.razorpayOrderId || transaction.stripeSessionId || 'N/A'}
                    {transaction.razorpayPaymentId && (
                      <div className="mt-1">
                        Payment ID: {transaction.razorpayPaymentId}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {transaction.status === 'success' ? 'Completed' :
                     transaction.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                  {transaction.status === 'success' && transaction.razorpayPaymentId && (
                    <DownloadReceiptButton 
                      paymentId={transaction.razorpayPaymentId} 
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        {currentPagination?.hasMore && !loading && (
          <div className="flex justify-center mt-4">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />
      <Credits />
      
      <main className="flex-1 container mx-auto px-4 py-8" style={{ marginTop: "120px" }}>
        <h1 className="history-title">History</h1>

        <div className="history-tabs">
          <button
            className={`tab-button ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <Box className="w-4 h-4" />
            Model Generations
          </button>
          <button
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <CreditCard className="w-4 h-4" />
            Credit Purchases
          </button>
        </div>

        {loading && models.length === 0 && transactions.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size={32} />
            <span className="ml-3 text-[var(--foreground-secondary)]">Loading history...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-lg font-medium">Failed to load history</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-opacity-90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
};

export default HistoryClient; 
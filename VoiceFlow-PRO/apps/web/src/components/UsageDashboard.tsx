/**
 * Usage Dashboard Component
 * Displays transcription usage statistics and cost tracking
 */

import React from 'react';
import { useUsageStats } from '@/hooks/useUnifiedVoiceEngine';
import { BarChart3, DollarSign, Clock, TrendingUp, Cloud, Laptop, CheckCircle, XCircle } from 'lucide-react';

export const UsageDashboard: React.FC = () => {
  const { stats, history, clearHistory } = useUsageStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
          Usage Dashboard
        </h2>
        <p style={{ color: '#6b7280' }}>
          Track your transcription usage and costs
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {/* Total Requests */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <BarChart3 size={24} style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Requests</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            {stats.totalRequests}
          </div>
        </div>

        {/* Total Cost */}
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <DollarSign size={24} style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Cost</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            {formatCurrency(stats.totalCost)}
          </div>
        </div>

        {/* Total Duration */}
        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <Clock size={24} style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Duration</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            {formatDuration(stats.totalDuration)}
          </div>
        </div>

        {/* Success Rate */}
        <div style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <TrendingUp size={24} style={{ marginRight: '12px' }} />
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Success Rate</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            {formatPercentage(stats.successRate)}
          </div>
        </div>
      </div>

      {/* Engine Usage */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Engine Usage
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Cloud Requests */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
            }}>
              <Cloud size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                Cloud (AIML API)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                {stats.cloudRequests}
              </div>
            </div>
          </div>

          {/* Local Requests */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
            }}>
              <Laptop size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                Local (Web Speech)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                {stats.localRequests}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.totalRequests > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(stats.cloudRequests / stats.totalRequests) * 100}%`,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
            }}>
              <span>Cloud: {formatPercentage((stats.cloudRequests / stats.totalRequests) * 100)}</span>
              <span>Local: {formatPercentage((stats.localRequests / stats.totalRequests) * 100)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent History */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
            Recent Transcriptions
          </h3>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280',
          }}>
            No transcriptions yet. Start recording to see your usage history!
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {history.slice().reverse().slice(0, 10).map((usage, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: index < 9 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                {/* Status Icon */}
                <div style={{ marginRight: '12px' }}>
                  {usage.success ? (
                    <CheckCircle size={20} color="#10b981" />
                  ) : (
                    <XCircle size={20} color="#ef4444" />
                  )}
                </div>

                {/* Engine Badge */}
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginRight: '12px',
                  background: usage.engine === 'cloud' ? '#ede9fe' : '#dbeafe',
                  color: usage.engine === 'cloud' ? '#7c3aed' : '#2563eb',
                }}>
                  {usage.engine === 'cloud' ? 'Cloud' : 'Local'}
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>
                    {formatDuration(usage.duration)} • {formatCurrency(usage.cost)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(usage.timestamp).toLocaleString()}
                  </div>
                  {usage.error && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                      Error: {usage.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


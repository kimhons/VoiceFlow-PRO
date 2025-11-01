/**
 * Dashboard Page
 * Main dashboard showing usage statistics and quick actions
 */

import React from 'react';
import { UsageDashboard } from '@/components/UsageDashboard';
import { useEngineAvailability } from '@/hooks/useUnifiedVoiceEngine';
import { Cloud, Laptop, AlertCircle, CheckCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { isCloudAvailable, isLocalAvailable, recommendedEngine, hasAnyEngine } = useEngineAvailability();

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            Monitor your transcription usage and performance
          </p>
        </div>
      </div>

      {/* Engine Status */}
      <div style={{ maxWidth: '1200px', margin: '-20px auto 0', padding: '0 24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Engine Status
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Cloud Engine Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '8px',
              background: isCloudAvailable ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${isCloudAvailable ? '#10b981' : '#ef4444'}`,
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: isCloudAvailable ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
              }}>
                {isCloudAvailable ? (
                  <CheckCircle size={24} color="white" />
                ) : (
                  <AlertCircle size={24} color="white" />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Cloud size={16} style={{ marginRight: '6px' }} />
                  <span style={{ fontWeight: '600' }}>Cloud Engine</span>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {isCloudAvailable ? 'Available (AIML API)' : 'Not configured'}
                </div>
              </div>
            </div>

            {/* Local Engine Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '8px',
              background: isLocalAvailable ? '#f0fdf4' : '#fef2f2',
              border: `2px solid ${isLocalAvailable ? '#10b981' : '#ef4444'}`,
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: isLocalAvailable ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
              }}>
                {isLocalAvailable ? (
                  <CheckCircle size={24} color="white" />
                ) : (
                  <AlertCircle size={24} color="white" />
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Laptop size={16} style={{ marginRight: '6px' }} />
                  <span style={{ fontWeight: '600' }}>Local Engine</span>
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {isLocalAvailable ? 'Available (Web Speech)' : 'Not supported'}
                </div>
              </div>
            </div>

            {/* Recommended Engine */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '8px',
              background: '#eff6ff',
              border: '2px solid #3b82f6',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                fontSize: '20px',
              }}>
                ⭐
              </div>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Recommended
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {recommendedEngine === 'cloud' ? 'Cloud (Best quality)' : 
                   recommendedEngine === 'local' ? 'Local (Free)' : 
                   'Auto (Smart selection)'}
                </div>
              </div>
            </div>
          </div>

          {/* Warning if no engines available */}
          {!hasAnyEngine && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: '#fef2f2',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'start',
            }}>
              <AlertCircle size={20} color="#ef4444" style={{ marginRight: '12px', marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>
                  No transcription engines available
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Please configure AIML API key in .env.local or use a browser that supports Web Speech API.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Usage Dashboard */}
      <UsageDashboard />
    </div>
  );
};

export default DashboardPage;


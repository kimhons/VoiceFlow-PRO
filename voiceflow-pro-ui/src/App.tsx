// VoiceFlow Pro UI Demo Application

import React, { useState, useRef } from 'react';
import { Settings, Sun, Moon, Monitor, Globe, Mic } from 'lucide-react';
import {
  VoiceRecording,
  TranscriptionDisplay,
  LanguageSelector,
  AudioVisualization,
  SettingsPanel,
} from './components';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TranscriptionSegment, AudioVisualizationData } from './types';

// Demo App Content Component
const AppContent: React.FC = () => {
  const { theme, resolvedTheme, setTheme, platform, colors, spacing, borderRadius, typography } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    isPaused: false,
    duration: 0,
    volume: 0,
    confidence: 1,
    language: 'en',
  });
  
  const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionSegment[]>([
    {
      id: '1',
      text: 'Welcome to VoiceFlow Pro, the next-generation voice-to-text productivity platform.',
      confidence: 0.95,
      startTime: 0,
      endTime: 3.5,
      isFinal: true,
      speaker: 'User',
    },
    {
      id: '2',
      text: 'This demo showcases our cross-platform UI components with accessibility features.',
      confidence: 0.92,
      startTime: 3.5,
      endTime: 6.8,
      isFinal: true,
      speaker: 'User',
    },
    {
      id: '3',
      text: 'Try recording your own voice or explore the settings panel.',
      confidence: 0.88,
      startTime: 6.8,
      endTime: 9.2,
      isFinal: false,
      speaker: 'User',
    },
  ]);
  
  const [audioData, setAudioData] = useState<AudioVisualizationData[]>([]);

  // Handle voice recording state changes
  const handleRecordingStateChange = (newState: any) => {
    setRecordingState(newState);
  };

  // Handle audio visualization data updates
  const handleAudioDataUpdate = (data: AudioVisualizationData) => {
    setAudioData(prev => [...prev.slice(-99), data]); // Keep last 100 data points
  };

  // Handle transcription segment editing
  const handleSegmentEdit = (segmentId: string, newText: string) => {
    setTranscriptionSegments(prev => 
      prev.map(segment => 
        segment.id === segmentId 
          ? { ...segment, text: newText, isFinal: true }
          : segment
      )
    );
  };

  // Theme toggle component
  const ThemeToggle: React.FC = () => (
    <div style={{ display: 'flex', gap: spacing.xs }}>
      {[
        { value: 'light', icon: <Sun size={16} />, label: 'Light' },
        { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
        { value: 'auto', icon: <Monitor size={16} />, label: 'Auto' },
      ].map(({ value, icon, label }) => (
        <button
          key={value}
          aria-label={`Switch to ${label} theme`}
          onClick={() => setTheme(value as any)}
          style={{
            padding: spacing.sm,
            border: theme === value ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
            borderRadius: borderRadius.small,
            backgroundColor: theme === value ? `${colors.primary}10` : colors.background,
            color: colors.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            transition: 'all 0.2s ease',
          }}
        >
          {icon}
          <span style={{ fontSize: '12px' }}>{label}</span>
        </button>
      ))}
    </div>
  );

  // Platform indicator
  const PlatformIndicator: React.FC = () => (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.small,
        fontSize: '12px',
        color: colors.textSecondary,
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: platform === 'mac' ? '#007AFF' : 
                           platform === 'windows' ? '#0078D4' : 
                           platform === 'linux' ? '#FF6B35' : colors.primary,
        }}
      />
      {platform.charAt(0).toUpperCase() + platform.slice(1)} detected
    </div>
  );

  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: typography.fontFamily,
    padding: spacing.xl,
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
    gap: spacing.md,
  };

  const mainGridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.xl,
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const sectionStyles: React.CSSProperties = {
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  };

  const titleStyles: React.CSSProperties = {
    margin: `0 0 ${spacing.lg} 0`,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  return (
    <div style={containerStyles}>
      {/* Header */}
      <header style={headerStyles}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text,
          }}>
            VoiceFlow Pro UI Components
          </h1>
          <p style={{ 
            margin: `${spacing.xs} 0 0 0`,
            fontSize: typography.fontSize.lg,
            color: colors.textSecondary,
          }}>
            Cross-platform voice recording interface with accessibility features
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <PlatformIndicator />
          <ThemeToggle />
          
          <button
            aria-label="Open settings"
            onClick={() => setIsSettingsOpen(true)}
            style={{
              padding: spacing.md,
              borderRadius: borderRadius.medium,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              transition: 'all 0.2s ease',
            }}
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <div style={mainGridStyles}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {/* Voice Recording Section */}
          <section style={sectionStyles}>
            <h2 style={titleStyles}>
              <Mic size={24} />
              Voice Recording
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <VoiceRecording
                onStateChange={handleRecordingStateChange}
                onRecordingStart={() => console.log('Recording started')}
                onRecordingStop={() => console.log('Recording stopped')}
                onRecordingPause={() => console.log('Recording paused')}
                onRecordingResume={() => console.log('Recording resumed')}
                showVolume={true}
                showSettings={false}
                size="large"
                variant="primary"
              />
              
              {/* Recording status */}
              <div
                style={{
                  padding: spacing.md,
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: borderRadius.medium,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <h4 style={{ margin: `0 0 ${spacing.sm} 0`, color: colors.text }}>
                  Recording Status
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: spacing.sm }}>
                  <div>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Status</span>
                    <div style={{ fontWeight: '500', color: recordingState.isRecording ? colors.error : colors.textSecondary }}>
                      {recordingState.isRecording ? (recordingState.isPaused ? 'Paused' : 'Recording') : 'Stopped'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Volume</span>
                    <div style={{ fontWeight: '500', color: colors.text }}>
                      {recordingState.volume}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>Language</span>
                    <div style={{ fontWeight: '500', color: colors.text }}>
                      <Globe size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {recordingState.language.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Audio Visualization Section */}
          <section style={sectionStyles}>
            <h2 style={titleStyles}>
              Audio Visualization
            </h2>
            
            <AudioVisualization
              isRecording={recordingState.isRecording}
              onDataUpdate={handleAudioDataUpdate}
              data={audioData}
              visualizationType="frequency"
              showRecordingIndicator={true}
              showVolume={true}
              showFrequency={true}
              height={120}
            />
            
            <p style={{ 
              margin: `${spacing.md} 0 0 0`,
              fontSize: '14px',
              color: colors.textSecondary,
            }}>
              Real-time audio visualization with multiple display types and accessibility features.
            </p>
          </section>

          {/* Language Selection Section */}
          <section style={sectionStyles}>
            <h2 style={titleStyles}>
              <Globe size={24} />
              Language Selection
            </h2>
            
            <LanguageSelector
              onAutoDetect={() => console.log('Auto-detecting language...')}
              searchable={true}
              showNativeNames={true}
              showFlags={true}
              size="medium"
            />
            
            <p style={{ 
              margin: `${spacing.md} 0 0 0`,
              fontSize: '14px',
              color: colors.textSecondary,
            }}>
              Choose from 20+ supported languages with auto-detection and search functionality.
            </p>
          </section>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {/* Transcription Display Section */}
          <section style={sectionStyles}>
            <h2 style={titleStyles}>
              Transcription Display
            </h2>
            
            <TranscriptionDisplay
              segments={transcriptionSegments}
              onSegmentEdit={handleSegmentEdit}
              editable={true}
              showTimestamps={true}
              showConfidence={true}
              showSpeaker={true}
              autoScroll={true}
              maxHeight="500px"
            />
          </section>

          {/* Features Overview */}
          <section style={sectionStyles}>
            <h2 style={titleStyles}>
              Key Features
            </h2>
            
            <div style={{ display: 'grid', gap: spacing.lg }}>
              {[
                {
                  title: 'Cross-Platform Support',
                  description: `Optimized for ${platform.charAt(0).toUpperCase() + platform.slice(1)}, Windows, and Linux with platform-specific UI adaptations.`,
                },
                {
                  title: 'Accessibility First',
                  description: 'WCAG 2.1 AA compliant with screen reader support, keyboard navigation, and customizable accessibility options.',
                },
                {
                  title: 'Real-time Processing',
                  description: 'Live audio visualization and transcription with confidence indicators and smart formatting.',
                },
                {
                  title: 'Customizable Themes',
                  description: 'Light, dark, and auto themes with high contrast modes and platform-specific styling.',
                },
              ].map((feature, index) => (
                <div key={index} style={{ padding: spacing.md, border: `1px solid ${colors.border}`, borderRadius: borderRadius.medium }}>
                  <h4 style={{ margin: `0 0 ${spacing.xs} 0`, color: colors.text }}>{feature.title}</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary }}>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(settings) => {
          console.log('Settings saved:', settings);
        }}
      />
    </div>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="auto">
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;

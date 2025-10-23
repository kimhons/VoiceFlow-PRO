// Voice Recording Component for VoiceFlow Pro

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Pause, Play, Settings, Volume2 } from 'lucide-react';
import { VoiceRecordingState, AccessibilityProps } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  getFocusStyles, 
  componentSizes, 
  announceToScreenReader, 
  generateAriaLabel 
} from '@/utils/accessibility';

interface VoiceRecordingProps extends AccessibilityProps {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingPause?: () => void;
  onRecordingResume?: () => void;
  onStateChange?: (state: VoiceRecordingState) => void;
  disabled?: boolean;
  showVolume?: boolean;
  showSettings?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'minimal';
  className?: string;
}

export const VoiceRecording: React.FC<VoiceRecordingProps> = ({
  onRecordingStart,
  onRecordingStop,
  onRecordingPause,
  onRecordingResume,
  onStateChange,
  disabled = false,
  showVolume = true,
  showSettings = true,
  size = 'medium',
  variant = 'primary',
  className = '',
  ...accessibilityProps
}) => {
  const { colors, spacing, borderRadius, platform, platformConfig } = useTheme();
  const { settings } = useSettings();
  
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    volume: 0,
    confidence: 1,
    language: settings.language,
  });
  
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const micRef = useRef<MediaStreamAudioSourceNode>();

  // Update parent component when state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Timer for recording duration
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padFocusStyles(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      micRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      micRef.current.connect(analyserRef.current);

      // Start volume monitoring
      const updateVolume = () => {
        if (analyserRef.current && state.isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const volume = average / 255;
          
          setState(prev => ({ 
            ...prev, 
            volume: Math.round(volume * 100) 
          }));
          
          requestAnimationFrame(updateVolume);
        }
      };
      
      updateVolume();

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false, 
        duration: 0,
        error: undefined,
      }));

      onRecordingStart?.();
      announceToScreenReader('Recording started', 'assertive');
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please check permissions.',
      }));
      announceToScreenReader('Failed to access microphone', 'assertive');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setState(prev => ({ 
      ...prev, 
      isRecording: false, 
      isPaused: false,
      volume: 0,
    }));

    onRecordingStop?.();
    announceToScreenReader('Recording stopped', 'assertive');
  };

  // Pause/Resume recording
  const togglePause = () => {
    setState(prev => ({ 
      ...prev, 
      isPaused: !prev.isPaused,
    }));

    if (state.isPaused) {
      onRecordingResume?.();
      announceToScreenReader('Recording resumed', 'polite');
    } else {
      onRecordingPause?.();
      announceToScreenReader('Recording paused', 'polite');
    }
  };

  // Get component styles based on size and variant
  const buttonSize = componentSizes.button[size];
  const focusStyles = getFocusStyles(platform, settings.accessibility.highContrast);

  const baseStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: buttonSize.height,
    padding: buttonSize.padding,
    fontSize: buttonSize.fontSize,
    fontWeight: '500',
    borderRadius: platform === 'mac' ? borderRadius.medium : 
                  platform === 'windows' ? borderRadius.small : 
                  borderRadius.medium,
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    outline: 'none',
    position: 'relative',
    minWidth: size === 'small' ? '80px' : size === 'large' ? '120px' : '100px',
  };

  const variantStyles: React.CSSProperties = {
    primary: {
      backgroundColor: state.isRecording ? colors.error : colors.primary,
      color: '#ffffff',
      boxShadow: state.isRecording 
        ? `0 4px 12px ${colors.error}40`
        : `0 2px 8px ${colors.primary}30`,
    },
    secondary: {
      backgroundColor: 'transparent',
      color: state.isRecording ? colors.error : colors.text,
      border: `1px solid ${state.isRecording ? colors.error : colors.border}`,
    },
    minimal: {
      backgroundColor: 'transparent',
      color: state.isRecording ? colors.error : colors.textSecondary,
      border: 'none',
    },
  };

  const recordingPulseAnimation = state.isRecording ? {
    animation: 'recording-pulse 2s infinite',
  } : {};

  return (
    <div className={`voice-recording ${className}`}>
      {/* Main recording button */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          {...accessibilityProps}
          aria-label={generateAriaLabel(
            'voice recording',
            state.isRecording ? 'active' : 'inactive',
            state.isRecording ? 'click to stop' : 'click to start'
          )}
          disabled={disabled}
          onClick={state.isRecording ? stopRecording : startRecording}
          style={{
            ...baseStyles,
            ...variantStyles[variant],
            ...focusStyles,
            ...recordingPulseAnimation,
            opacity: disabled ? 0.6 : 1,
          }}
          onFocus={() => setShowVolumeIndicator(true)}
          onBlur={() => setShowVolumeIndicator(false)}
        >
          {state.isRecording ? (
            <Square size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
          ) : (
            <Mic size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
          )}
          
          <span>
            {state.isRecording 
              ? 'Stop' 
              : 'Record'
            }
          </span>

          {/* Recording duration */}
          {state.isRecording && (
            <span 
              style={{ 
                fontSize: '12px', 
                opacity: 0.8,
                fontFamily: 'monospace',
              }}
              aria-live="polite"
            >
              {formatDuration(state.duration)}
            </span>
          )}
        </button>

        {/* Pause/Resume button */}
        {state.isRecording && (
          <button
            aria-label={state.isPaused ? 'Resume recording' : 'Pause recording'}
            onClick={togglePause}
            style={{
              ...baseStyles,
              backgroundColor: colors.secondary,
              color: colors.text,
              marginLeft: spacing.xs,
              minWidth: '60px',
              ...focusStyles,
            }}
          >
            {state.isPaused ? (
              <Play size={16} />
            ) : (
              <Pause size={16} />
            )}
          </button>
        )}

        {/* Volume indicator */}
        {showVolume && state.isRecording && showVolumeIndicator && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: spacing.sm,
              backgroundColor: colors.backgroundSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.small,
              padding: spacing.xs,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <Volume2 size={14} />
              <div
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: colors.border,
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${state.volume}%`,
                    height: '100%',
                    backgroundColor: state.volume > 70 ? colors.error : colors.success,
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                {state.volume}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {state.error && (
        <div
          style={{
            color: colors.error,
            fontSize: '12px',
            marginTop: spacing.xs,
            textAlign: 'center',
          }}
          role="alert"
          aria-live="assertive"
        >
          {state.error}
        </div>
      )}

      {/* CSS for recording pulse animation */}
      <style>{`
        @keyframes recording-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .sr-only {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
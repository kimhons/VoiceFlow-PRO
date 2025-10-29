/**
 * Streaming Integration Tests
 * Phase 1.5: Testing Suite
 * 
 * Tests the complete flow from user interaction to transcription
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeTranscription } from '../../hooks/useRealtimeTranscription';
import { WebSocketStreamingService } from '../../services/websocket-streaming.service';

describe('Streaming Integration Tests', () => {
  let mockWebSocket: any;
  let mockAudioContext: any;
  let mockMediaStream: MediaStream;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    // Mock AudioContext
    mockAudioContext = {
      sampleRate: 16000,
      state: 'running',
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    global.AudioContext = vi.fn(() => mockAudioContext) as any;

    // Mock MediaStream
    mockMediaStream = {
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    } as MediaStream;

    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Recording Flow', () => {
    it('should complete full recording and transcription flow', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      // Step 1: Connect
      await act(async () => {
        await result.current.connect();
      });

      // Simulate WebSocket open
      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Step 2: Start streaming
      await act(async () => {
        await result.current.startStreaming();
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true);
      });

      // Step 3: Receive interim transcript
      act(() => {
        mockWebSocket.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'transcript',
              text: 'Hello',
              is_final: false,
              confidence: 0.8,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(result.current.interimTranscript).toBe('Hello');
      });

      // Step 4: Receive final transcript
      act(() => {
        mockWebSocket.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'transcript',
              text: 'Hello world',
              is_final: true,
              confidence: 0.95,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(result.current.transcript).toBe('Hello world');
        expect(result.current.interimTranscript).toBe('');
      });

      // Step 5: Stop streaming
      await act(async () => {
        await result.current.stopStreaming();
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });

      // Step 6: Disconnect
      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should handle multiple transcript segments', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await act(async () => {
        await result.current.startStreaming();
      });

      // Receive multiple transcript segments
      const segments = [
        { text: 'Hello', is_final: true, confidence: 0.95 },
        { text: 'world', is_final: true, confidence: 0.93 },
        { text: 'this', is_final: true, confidence: 0.96 },
        { text: 'is', is_final: true, confidence: 0.94 },
        { text: 'a', is_final: true, confidence: 0.92 },
        { text: 'test', is_final: true, confidence: 0.97 },
      ];

      for (const segment of segments) {
        act(() => {
          mockWebSocket.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'transcript',
                ...segment,
              }),
            })
          );
        });
      }

      await waitFor(() => {
        expect(result.current.transcript).toBe('Hello world this is a test');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from connection errors', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      // First connection attempt fails
      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected error
        }
      });

      act(() => {
        mockWebSocket.onerror?.(new Event('error'));
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second connection attempt succeeds
      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.error).toBe(null);
      });
    });

    it('should handle WebSocket disconnection during streaming', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await act(async () => {
        await result.current.startStreaming();
      });

      // Simulate disconnection
      act(() => {
        mockWebSocket.onclose?.(new CloseEvent('close', { code: 1006 }));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.isStreaming).toBe(false);
      });
    });
  });

  describe('Audio Processing', () => {
    it('should process audio chunks correctly', async () => {
      const service = new WebSocketStreamingService('test-api-key');

      await act(async () => {
        await service.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await act(async () => {
        await service.startStreaming(mockMediaStream);
      });

      // Simulate audio processing
      const processor = mockAudioContext.createScriptProcessor.mock.results[0].value;
      const audioEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
        },
      };

      act(() => {
        processor.onaudioprocess?.(audioEvent);
      });

      // Verify audio chunk was sent
      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should handle different sample rates', async () => {
      const service = new WebSocketStreamingService('test-api-key');

      // Test with 44100 Hz
      mockAudioContext.sampleRate = 44100;

      await act(async () => {
        await service.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await act(async () => {
        await service.startStreaming(mockMediaStream);
      });

      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency transcript updates', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      await act(async () => {
        await result.current.startStreaming();
      });

      // Send 100 interim transcripts rapidly
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        act(() => {
          mockWebSocket.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({
                type: 'transcript',
                text: `Word ${i}`,
                is_final: false,
                confidence: 0.8,
              }),
            })
          );
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process all updates in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should not leak memory on repeated connect/disconnect', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      // Connect and disconnect 10 times
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          await result.current.connect();
        });

        act(() => {
          mockWebSocket.onopen?.(new Event('open'));
        });

        act(() => {
          result.current.disconnect();
        });

        act(() => {
          mockWebSocket.onclose?.(new CloseEvent('close', { code: 1000 }));
        });
      }

      // Should not throw or cause issues
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcripts', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      act(() => {
        mockWebSocket.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'transcript',
              text: '',
              is_final: true,
              confidence: 0.0,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(result.current.transcript).toBe('');
      });
    });

    it('should handle very long transcripts', async () => {
      const { result } = renderHook(() =>
        useRealtimeTranscription({
          apiKey: 'test-api-key',
        })
      );

      await act(async () => {
        await result.current.connect();
      });

      act(() => {
        mockWebSocket.onopen?.(new Event('open'));
      });

      const longText = 'word '.repeat(1000); // 5000 characters

      act(() => {
        mockWebSocket.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'transcript',
              text: longText,
              is_final: true,
              confidence: 0.95,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(result.current.transcript).toBe(longText);
      });
    });
  });
});


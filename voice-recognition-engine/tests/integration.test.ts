/**
 * Integration tests for VoiceFlow Pro Voice Recognition Engine
 * These tests verify end-to-end functionality across different components
 */

import {
  VoiceFlowRecognitionEngine,
  WebSpeechEngine,
  WhisperEngine,
  AudioProcessor,
  VoiceUtils,
  ModelType,
  QualityLevel,
  Language
} from '../src/index';

describe('Voice Recognition Integration Tests', () => {
  describe('Full Workflow Integration', () => {
    test('should handle complete recognition workflow', async () => {
      const engine = new VoiceFlowRecognitionEngine({
        primaryEngine: ModelType.WEB_SPEECH_API,
        autoEngineSelection: true
      });

      // Initialize
      await engine.initialize('en-US');
      expect(engine.isInitialized).toBe(true);
      expect(engine.currentLanguage?.code).toBe('en-US');

      // Set up result handler
      const resultPromise = new Promise<any>((resolve) => {
        engine.on('recognition:result', (result) => {
          expect(result.transcript).toBeDefined();
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          resolve(result);
        });
      });

      // Start recognition
      await engine.startListening();
      expect(engine.isListening).toBe(true);

      // Wait for result
      const result = await resultPromise;
      expect(result.transcript).toBe('Hello world test'); // From mock

      // Stop recognition
      await engine.stopListening();
      expect(engine.isListening).toBe(false);

      // Verify statistics
      const stats = engine.getStatistics();
      expect(stats.totalRecognitions).toBeGreaterThan(0);

      engine.dispose();
    });

    test('should handle error recovery workflow', async () => {
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      const errorPromise = new Promise<any>((resolve) => {
        engine.on('recognition:error', (error) => {
          expect(error).toBeDefined();
          resolve(error);
        });
      });

      await engine.startListening();

      // Simulate an error scenario (this depends on actual error handling implementation)
      try {
        // Some operation that might cause an error
        await engine.startListening(); // Double start might cause error
      } catch (error) {
        // Expected to handle gracefully
      }

      // Should still be able to stop
      await engine.stopListening();
      engine.dispose();
    });
  });

  describe('Multi-Engine Integration', () => {
    test('should seamlessly switch between engines', async () => {
      const engine = new VoiceFlowRecognitionEngine({
        primaryEngine: ModelType.WEB_SPEECH_API,
        autoEngineSelection: false
      });

      await engine.initialize('en-US');
      await engine.startListening();

      // Switch to Whisper while listening
      await engine.switchEngine(ModelType.WHISPER_BASE);
      expect(engine.currentEngine).toBe(ModelType.WHISPER_BASE);
      expect(engine.isListening).toBe(true);

      // Switch back to Web Speech API
      await engine.switchEngine(ModelType.WEB_SPEECH_API);
      expect(engine.currentEngine).toBe(ModelType.WEB_SPEECH_API);
      expect(engine.isListening).toBe(true);

      await engine.stopListening();
      engine.dispose();
    });

    test('should handle engine failures gracefully', async () => {
      const engines = [
        new VoiceFlowRecognitionEngine({ primaryEngine: ModelType.WEB_SPEECH_API }),
        new VoiceFlowRecognitionEngine({ primaryEngine: ModelType.WHISPER_BASE })
      ];

      // Initialize all engines
      await Promise.all(engines.map(engine => engine.initialize('en-US')));
      engines.forEach(engine => {
        expect(engine.isInitialized).toBe(true);
      });

      // Start all engines
      await Promise.all(engines.map(engine => engine.startListening()));
      engines.forEach(engine => {
        expect(engine.isListening).toBe(true);
      });

      // Clean up
      await Promise.all(engines.map(engine => engine.stopListening()));
      engines.forEach(engine => engine.dispose());
    });
  });

  describe('Language Integration', () => {
    test('should handle multi-language workflow', async () => {
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      const languages = ['en-US', 'es-ES', 'fr-FR', 'de-DE'];
      const results: any[] = [];

      for (const lang of languages) {
        await engine.setLanguage(lang);
        expect(engine.currentLanguage?.code).toBe(lang);

        // Start listening in this language
        const resultPromise = new Promise<any>((resolve) => {
          const resultHandler = (result: any) => {
            engine.off('recognition:result', resultHandler);
            resolve(result);
          };
          engine.on('recognition:result', resultHandler);
        });

        await engine.startListening();
        const result = await resultPromise;
        expect(result.language).toBe(lang);
        results.push(result);
        await engine.stopListening();
      }

      expect(results).toHaveLength(4);
      engine.dispose();
    });

    test('should maintain consistency during language switch', async () => {
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      await engine.startListening();

      // Switch language while listening
      await engine.setLanguage('es-ES');
      expect(engine.currentLanguage?.code).toBe('es-ES');
      expect(engine.isListening).toBe(true); // Should continue listening

      // Verify engine state is maintained
      expect(engine.isInitialized).toBe(true);
      expect(engine.isListening).toBe(true);

      await engine.stopListening();
      engine.dispose();
    });
  });

  describe('Plugin System Integration', () => {
    class NoiseReductionPlugin {
      name = 'noise-reduction';
      version = '1.0.0';
      initialized = false;
      cleaned = false;

      async initialize(): Promise<void> {
        this.initialized = true;
      }

      async cleanup(): Promise<void> {
        this.cleaned = true;
      }

      async onRecognition(result: any): Promise<any> {
        // Apply noise reduction
        return {
          ...result,
          metadata: {
            ...result.metadata,
            noiseReduced: true
          }
        };
      }
    }

    class ConfidenceEnhancementPlugin {
      name = 'confidence-enhancement';
      version = '1.0.0';
      initialized = false;

      async initialize(): Promise<void> {
        this.initialized = true;
      }

      async cleanup(): Promise<void> {
        this.cleaned = true;
      }
    }

    test('should integrate multiple plugins', async () => {
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      const noisePlugin = new NoiseReductionPlugin();
      const confidencePlugin = new ConfidenceEnhancementPlugin();

      // Register plugins
      await engine.registerPlugin(noisePlugin);
      await engine.registerPlugin(confidencePlugin);

      expect(noisePlugin.initialized).toBe(true);
      expect(confidencePlugin.initialized).toBe(true);

      // Verify plugins are registered
      expect(engine.getPlugin('noise-reduction')).toBe(noisePlugin);
      expect(engine.getPlugin('confidence-enhancement')).toBe(confidencePlugin);
      expect(engine.getAllPlugins()).toHaveLength(2);

      // Test plugin interaction
      await engine.startListening();

      const resultPromise = new Promise<any>((resolve) => {
        engine.on('recognition:result', (result) => {
          resolve(result);
        });
      });

      const result = await resultPromise;
      expect(result.metadata?.noiseReduced).toBe(true);

      await engine.stopListening();

      // Unregister plugins
      await engine.unregisterPlugin('noise-reduction');
      await engine.unregisterPlugin('confidence-enhancement');

      expect(noisePlugin.cleaned).toBe(true);
      expect(confidencePlugin.cleaned).toBe(true);
      expect(engine.getAllPlugins()).toHaveLength(0);

      engine.dispose();
    });
  });

  describe('Audio Processing Integration', () => {
    let audioProcessor: AudioProcessor;

    beforeEach(() => {
      audioProcessor = new AudioProcessor();
    });

    afterEach(() => {
      audioProcessor.dispose();
    });

    test('should integrate audio processing with recognition', async () => {
      await audioProcessor.initialize();
      await audioProcessor.startRecording();

      // Get audio metrics
      const metrics = audioProcessor.getAudioMetrics();
      expect(metrics).toHaveProperty('volume');
      expect(metrics).toHaveProperty('signalToNoiseRatio');

      // Apply noise reduction
      const audioData = new Float32Array(1024);
      audioData.fill(0.1);
      const processed = audioProcessor.applyNoiseReduction(audioData);

      expect(processed).toBeInstanceOf(Float32Array);
      expect(processed.length).toBe(1024);

      audioProcessor.stopRecording();
    });

    test('should handle audio level monitoring', async () => {
      await audioProcessor.initialize();
      await audioProcessor.startRecording();

      // Monitor audio levels for a short period
      const audioLevels: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const level = audioProcessor.getCurrentAudioLevel();
        audioLevels.push(level);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All levels should be valid (0-1 range)
      audioLevels.forEach(level => {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
      });

      audioProcessor.stopRecording();
    });
  });

  describe('VoiceUtils Integration', () => {
    test('should work with recognition results', async () => {
      const mockResult = {
        transcript: 'Hello world test',
        confidence: 0.95,
        isFinal: true,
        timestamp: Date.now(),
        language: 'en-US',
        alternatives: [{ transcript: 'Hello world test', confidence: 0.95 }],
        metadata: {
          audioLevel: 0.5,
          signalQuality: 0.9,
          processingTime: 100,
          modelUsed: ModelType.WEB_SPEECH_API,
          noiseLevel: 0.1
        }
      };

      // Test text processing utilities
      const formatted = VoiceUtils.formatTranscript(mockResult);
      expect(formatted).toContain('Hello world test');
      expect(formatted).toContain('en-US');

      // Test confidence utilities
      const confidenceChecker = VoiceUtils.createConfidenceChecker(0.8);
      expect(confidenceChecker(mockResult)).toBe(true);

      const lowConfidenceResult = { ...mockResult, confidence: 0.7 };
      expect(confidenceChecker(lowConfidenceResult)).toBe(false);

      // Test language utilities
      expect(VoiceUtils.isLanguageSupported('en-US')).toBe(true);
      expect(VoiceUtils.isLanguageSupported('invalid-lang')).toBe(false);

      const englishLangs = VoiceUtils.searchLanguages('English');
      expect(englishLangs.length).toBeGreaterThan(0);

      const allLangs = VoiceUtils.getAllLanguages();
      expect(allLangs.length).toBeGreaterThan(150);
    });

    test('should handle command parsing', async () => {
      const commands = {
        'start recording': 'start',
        'stop recording': 'stop',
        'pause recording': 'pause',
        'resume recording': 'resume'
      };

      const parser = VoiceUtils.createVoiceCommandParser(commands);

      // Test exact matches
      expect(parser('Please start recording now')).toBe('start');
      expect(parser('Can you stop recording')).toBe('stop');
      expect(parser('Pause recording please')).toBe('pause');
      expect(parser('Resume recording')).toBe('resume');

      // Test non-matches
      expect(parser('Unknown command text')).toBeNull();
      expect(parser('Just regular conversation')).toBeNull();
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance under load', async () => {
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      // Add multiple listeners
      const listeners: Array<() => void> = [];
      for (let i = 0; i < 20; i++) {
        const handler = jest.fn();
        const removeHandler = engine.on('recognition:result', handler);
        listeners.push(removeHandler);
      }

      const startTime = performance.now();
      await engine.startListening();
      const startupTime = performance.now() - startTime;

      // Should start quickly even with many listeners
      expect(startupTime).toBeLessThan(100);

      // Wait for some activity
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stopTime = performance.now();
      await engine.stopListening();
      const stopDuration = performance.now() - stopTime;

      // Should stop quickly
      expect(stopDuration).toBeLessThan(50);

      // Clean up listeners
      listeners.forEach(remove => remove());
      engine.dispose();
    });

    test('should handle concurrent operations efficiently', async () => {
      const engines = [
        new VoiceFlowRecognitionEngine({ primaryEngine: ModelType.WEB_SPEECH_API }),
        new VoiceFlowRecognitionEngine({ primaryEngine: ModelType.WHISPER_BASE })
      ];

      const startTime = performance.now();

      // Initialize all engines concurrently
      await Promise.all(engines.map(engine => engine.initialize('en-US')));

      // Start all engines concurrently
      await Promise.all(engines.map(engine => engine.startListening()));

      const operationTime = performance.now() - startTime;

      // Concurrent operations should complete within reasonable time
      expect(operationTime).toBeLessThan(500);

      // All engines should be operational
      engines.forEach(engine => {
        expect(engine.isListening).toBe(true);
        expect(engine.isInitialized).toBe(true);
      });

      // Clean up concurrently
      await Promise.all(engines.map(engine => engine.stopListening()));
      engines.forEach(engine => engine.dispose());
    });
  });

  describe('Cross-Platform Integration', () => {
    test('should handle different browser environments', async () => {
      // This test would run in different environments in CI
      const engine = new VoiceFlowRecognitionEngine();
      await engine.initialize('en-US');

      // Verify platform-specific features work
      expect(engine.isSupported).toBe(true);

      // Test basic functionality
      await engine.startListening();
      expect(engine.isListening).toBe(true);
      await engine.stopListening();

      engine.dispose();
    });

    test('should work with different audio configurations', async () => {
      const engines = [
        new VoiceFlowRecognitionEngine({ audioConfig: { sampleRate: 44100 } }),
        new VoiceFlowRecognitionEngine({ audioConfig: { sampleRate: 48000 } })
      ];

      await Promise.all(engines.map(engine => engine.initialize('en-US')));

      // Both should work with their audio configs
      engines.forEach(engine => {
        expect(engine.isInitialized).toBe(true);
      });

      engines.forEach(engine => engine.dispose());
    });
  });
});
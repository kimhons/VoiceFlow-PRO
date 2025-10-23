/**
 * Whisper.js integration for offline voice recognition
 * Provides high-quality offline speech recognition with multiple model sizes
 */

import EventEmitter from 'eventemitter3';
import {
  SpeechRecognitionResult,
  Alternative,
  RecognitionMetadata,
  ModelType,
  Language,
  AudioMetrics,
  RecognitionConfig,
  RecognitionError,
  ErrorCode,
  QualityLevel,
  VoiceRecognitionEvents
} from '../types';

export interface WhisperModel {
  name: string;
  size: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  memoryUsage: number;
  accuracy: QualityLevel;
  speed: QualityLevel;
  languages: string[];
  isLoaded: boolean;
}

export interface WhisperConfig {
  model: ModelType.WHISPER_TINY | ModelType.WHISPER_BASE | ModelType.WHISPER_SMALL | 
         ModelType.WHISPER_MEDIUM | ModelType.WHISPER_LARGE;
  language?: string;
  temperature: number;
  wordTimestamps: boolean;
  vadFilter: boolean;
  vadParameters: {
    threshold: number;
    minSilenceDuration: number;
    minSpeechDuration: number;
  };
}

export class WhisperEngine extends EventEmitter<VoiceRecognitionEvents> {
  private whisper: any = null; // Whisper library instance
  private models: Map<ModelType, WhisperModel> = new Map();
  private currentModel: ModelType | null = null;
  private isInitialized = false;
  private isListening = false;
  private audioBuffer: Float32Array[] = [];
  private config: WhisperConfig;
  private recognitionConfig: RecognitionConfig;
  private currentLanguage: Language | null = null;
  private processingQueue: AudioBuffer[] = [];
  private isProcessing = false;
  private worker: Worker | null = null;
  private cache: Map<string, SpeechRecognitionResult> = new Map();

  constructor(config: Partial<WhisperConfig & RecognitionConfig> = {}) {
    super();
    
    this.config = {
      model: ModelType.WHISPER_BASE,
      temperature: 0,
      wordTimestamps: false,
      vadFilter: true,
      vadParameters: {
        threshold: 0.6,
        minSilenceDuration: 500,
        minSpeechDuration: 250
      },
      ...config
    };

    this.recognitionConfig = {
      language: 'en-US',
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      confidenceThreshold: 0.3,
      noiseReduction: true,
      autoLanguageDetection: true,
      realTimeTranscription: false,
      ...config
    };

    this.initializeModels();
  }

  private initializeModels(): void {
    this.models.set(ModelType.WHISPER_TINY, {
      name: 'whisper-tiny',
      size: 'tiny',
      memoryUsage: 75,
      accuracy: QualityLevel.FAIR,
      speed: QualityLevel.EXCELLENT,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'tr', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'be', 'mk', 'sq', 'mt', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'id', 'ms', 'tl', 'ur', 'fa', 'he', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw', 'zu', 'af', 'mg', 'yo', 'ig', 'ha', 'ny'],
      isLoaded: false
    });

    this.models.set(ModelType.WHISPER_BASE, {
      name: 'whisper-base',
      size: 'base',
      memoryUsage: 142,
      accuracy: QualityLevel.GOOD,
      speed: QualityLevel.GOOD,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'tr', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'be', 'mk', 'sq', 'mt', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'id', 'ms', 'tl', 'ur', 'fa', 'he', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw', 'zu', 'af', 'mg', 'yo', 'ig', 'ha', 'ny'],
      isLoaded: false
    });

    this.models.set(ModelType.WHISPER_SMALL, {
      name: 'whisper-small',
      size: 'small',
      memoryUsage: 488,
      accuracy: QualityLevel.EXCELLENT,
      speed: QualityLevel.FAIR,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'tr', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'be', 'mk', 'sq', 'mt', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'id', 'ms', 'tl', 'ur', 'fa', 'he', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw', 'zu', 'af', 'mg', 'yo', 'ig', 'ha', 'ny'],
      isLoaded: false
    });

    this.models.set(ModelType.WHISPER_MEDIUM, {
      name: 'whisper-medium',
      size: 'medium',
      memoryUsage: 1542,
      accuracy: QualityLevel.EXCELLENT,
      speed: QualityLevel.FAIR,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'tr', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'be', 'mk', 'sq', 'mt', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'id', 'ms', 'tl', 'ur', 'fa', 'he', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw', 'zu', 'af', 'mg', 'yo', 'ig', 'ha', 'ny'],
      isLoaded: false
    });

    this.models.set(ModelType.WHISPER_LARGE, {
      name: 'whisper-large',
      size: 'large',
      memoryUsage: 3080,
      accuracy: QualityLevel.EXCELLENT,
      speed: QualityLevel.FAIR,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'tr', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'el', 'uk', 'be', 'mk', 'sq', 'mt', 'is', 'ga', 'cy', 'eu', 'ca', 'gl', 'id', 'ms', 'tl', 'ur', 'fa', 'he', 'bn', 'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'or', 'as', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am', 'sw', 'zu', 'af', 'mg', 'yo', 'ig', 'ha', 'ny'],
      isLoaded: false
    });
  }

  async initialize(language?: string): Promise<void> {
    try {
      // Initialize Whisper in a Web Worker for better performance
      await this.initializeWorker();

      // Load the default model
      await this.loadModel(this.config.model);

      // Set language if provided
      if (language) {
        await this.setLanguage(language);
      }

      this.isInitialized = true;
      console.log('Whisper engine initialized successfully');
    } catch (error) {
      throw new RecognitionError(
        `Failed to initialize Whisper engine: ${error}`,
        ErrorCode.MODEL_LOAD_FAILED,
        ModelType.WHISPER_BASE
      );
    }
  }

  private async initializeWorker(): Promise<void> {
    // Create a Web Worker for Whisper processing
    const workerCode = `
      // Whisper Web Worker
      importScripts('https://cdn.jsdelivr.net/npm/whisper-web@1.0.0/dist/whisper.js');
      
      let whisper = null;
      
      self.onmessage = async function(e) {
        const { type, data } = e.data;
        
        switch (type) {
          case 'INIT':
            try {
              whisper = new Whisper();
              self.postMessage({ type: 'INIT_SUCCESS' });
            } catch (error) {
              self.postMessage({ type: 'INIT_ERROR', error: error.message });
            }
            break;
            
          case 'LOAD_MODEL':
            try {
              await whisper.loadModel(data.model);
              self.postMessage({ type: 'MODEL_LOADED', model: data.model });
            } catch (error) {
              self.postMessage({ type: 'MODEL_ERROR', error: error.message });
            }
            break;
            
          case 'TRANSCRIBE':
            try {
              const result = await whisper.transcribe(data.audio, data.config);
              self.postMessage({ 
                type: 'TRANSCRIPTION_RESULT', 
                result: result,
                id: data.id 
              });
            } catch (error) {
              self.postMessage({ 
                type: 'TRANSCRIPTION_ERROR', 
                error: error.message,
                id: data.id 
              });
            }
            break;
            
          case 'LANGUAGE_DETECT':
            try {
              const detectedLang = await whisper.detectLanguage(data.audio);
              self.postMessage({ 
                type: 'LANGUAGE_DETECTED', 
                language: detectedLang,
                id: data.id 
              });
            } catch (error) {
              self.postMessage({ 
                type: 'LANGUAGE_DETECT_ERROR', 
                error: error.message,
                id: data.id 
              });
            }
            break;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerUrl);
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Failed to create worker'));
        return;
      }

      this.worker.onmessage = (e) => {
        const { type, error } = e.data;
        
        switch (type) {
          case 'INIT_SUCCESS':
            resolve();
            break;
          case 'INIT_ERROR':
            reject(new Error(error));
            break;
        }
      };

      this.worker.postMessage({ type: 'INIT' });
    });
  }

  private async loadModel(modelType: ModelType): Promise<void> {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    // Check if model is already loaded
    if (model.isLoaded) {
      this.currentModel = modelType;
      return;
    }

    // Check if language is supported by this model
    if (this.currentLanguage && !model.languages.includes(this.currentLanguage.code)) {
      throw new Error(`Model ${modelType} does not support language ${this.currentLanguage.code}`);
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        const { type, model: loadedModel, error } = e.data;
        
        switch (type) {
          case 'MODEL_LOADED':
            if (loadedModel === model.name) {
              model.isLoaded = true;
              this.currentModel = modelType;
              this.worker?.removeEventListener('message', handleMessage);
              resolve();
            }
            break;
          case 'MODEL_ERROR':
            this.worker?.removeEventListener('message', handleMessage);
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ 
        type: 'LOAD_MODEL', 
        data: { model: model.name } 
      });
    });
  }

  async switchModel(modelType: ModelType): Promise<void> {
    await this.loadModel(modelType);
    this.emit('model:switched', modelType);
  }

  async setLanguage(languageCode: string): Promise<void> {
    // Find language
    const language = this.getLanguageInfo(languageCode);
    if (!language) {
      throw new RecognitionError(
        `Language not supported: ${languageCode}`,
        ErrorCode.LANGUAGE_NOT_SUPPORTED,
        this.currentModel || ModelType.WHISPER_BASE
      );
    }

    // Check if current model supports this language
    if (this.currentModel) {
      const model = this.models.get(this.currentModel);
      if (!model?.languages.includes(languageCode)) {
        // Need to switch to a model that supports this language
        const suitableModel = this.findSuitableModel(languageCode);
        if (suitableModel) {
          await this.loadModel(suitableModel);
        }
      }
    }

    this.currentLanguage = language;
    console.log(`Language set to: ${languageCode} (${language.name})`);
  }

  private getLanguageInfo(code: string): Language | null {
    // Simple language mapping for Whisper
    const languageMap: { [key: string]: Language } = {
      'en': { code: 'en', name: 'English', nativeName: 'English', webSpeechCode: 'en-US', whisperCode: 'en', supported: true, autoDetectSupported: true, quality: { webSpeech: QualityLevel.EXCELLENT, whisper: QualityLevel.EXCELLENT, overall: QualityLevel.EXCELLENT } },
      'es': { code: 'es', name: 'Spanish', nativeName: 'Español', webSpeechCode: 'es-ES', whisperCode: 'es', supported: true, autoDetectSupported: true, quality: { webSpeech: QualityLevel.EXCELLENT, whisper: QualityLevel.EXCELLENT, overall: QualityLevel.EXCELLENT } },
      'fr': { code: 'fr', name: 'French', nativeName: 'Français', webSpeechCode: 'fr-FR', whisperCode: 'fr', supported: true, autoDetectSupported: true, quality: { webSpeech: QualityLevel.EXCELLENT, whisper: QualityLevel.EXCELLENT, overall: QualityLevel.EXCELLENT } },
      'de': { code: 'de', name: 'German', nativeName: 'Deutsch', webSpeechCode: 'de-DE', whisperCode: 'de', supported: true, autoDetectSupported: true, quality: { webSpeech: QualityLevel.EXCELLENT, whisper: QualityLevel.EXCELLENT, overall: QualityLevel.EXCELLENT } }
      // ... Add more languages as needed
    };

    return languageMap[code] || null;
  }

  private findSuitableModel(languageCode: string): ModelType | null {
    // Find the smallest model that supports the language and has acceptable quality
    const preferredModels = [
      ModelType.WHISPER_TINY,
      ModelType.WHISPER_BASE,
      ModelType.WHISPER_SMALL,
      ModelType.WHISPER_MEDIUM,
      ModelType.WHISPER_LARGE
    ];

    for (const modelType of preferredModels) {
      const model = this.models.get(modelType);
      if (model?.languages.includes(languageCode)) {
        return modelType;
      }
    }

    return null;
  }

  startListening(): Promise<void> {
    if (!this.isInitialized) {
      throw new RecognitionError(
        'Whisper engine not initialized',
        ErrorCode.NOT_SUPPORTED,
        ModelType.WHISPER_BASE
      );
    }

    if (this.isListening) {
      console.warn('Already listening');
      return Promise.resolve();
    }

    this.isListening = true;
    this.audioBuffer = [];
    this.emit('recognition:start');

    // Start processing loop
    this.processAudio();

    return Promise.resolve();
  }

  private async processAudio(): Promise<void> {
    if (!this.isListening) return;

    try {
      // Get audio data from microphone (implementation depends on audio capture)
      // For now, we'll simulate audio capture
      const audioData = await this.captureAudio();
      
      if (audioData && audioData.length > 0) {
        this.audioBuffer.push(audioData);
        
        // Process audio when we have enough data
        if (this.audioBuffer.length >= 3) { // Process every 3 chunks
          const fullAudio = this.concatenateAudioBuffers(this.audioBuffer.slice(0, 3));
          this.audioBuffer = this.audioBuffer.slice(3);
          
          await this.transcribeAudio(fullAudio);
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }

    // Continue processing
    setTimeout(() => this.processAudio(), 100); // Process every 100ms
  }

  private async captureAudio(): Promise<Float32Array | null> {
    // Mock implementation - in reality, this would capture from microphone
    // using Web Audio API or similar
    return null; // Placeholder
  }

  private concatenateAudioBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const result = new Float32Array(totalLength);
    
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }

  private async transcribeAudio(audioData: Float32Array): Promise<void> {
    if (!this.worker || !this.currentModel) return;

    const transcriptionId = `transcription_${Date.now()}_${Math.random()}`;
    
    const handleMessage = (e: MessageEvent) => {
      const { type, result, error, id } = e.data;
      
      if (id !== transcriptionId) return;

      switch (type) {
        case 'TRANSCRIPTION_RESULT':
          this.processTranscriptionResult(result);
          this.worker?.removeEventListener('message', handleMessage);
          break;
        case 'TRANSCRIPTION_ERROR':
          const recognitionError = new RecognitionError(
            `Transcription error: ${error}`,
            ErrorCode.AUDIO_PROCESSING_ERROR,
            this.currentModel!
          );
          this.emit('recognition:error', recognitionError);
          this.worker?.removeEventListener('message', handleMessage);
          break;
      }
    };

    this.worker.addEventListener('message', handleMessage);

    this.worker.postMessage({
      type: 'TRANSCRIBE',
      data: {
        audio: audioData,
        config: {
          language: this.currentLanguage?.code,
          temperature: this.config.temperature,
          wordTimestamps: this.config.wordTimestamps,
          vad: this.config.vadFilter
        },
        id: transcriptionId
      }
    });
  }

  private processTranscriptionResult(whisperResult: any): void {
    // Convert Whisper result to our SpeechRecognitionResult format
    const transcript = whisperResult.text || '';
    const confidence = whisperResult.confidence || 0.8;

    const alternatives: Alternative[] = [
      { transcript, confidence }
    ];

    const metadata: RecognitionMetadata = {
      audioLevel: this.getAudioLevel(),
      signalQuality: this.calculateSignalQuality(confidence),
      processingTime: whisperResult.processingTime || 0,
      modelUsed: this.currentModel || ModelType.WHISPER_BASE,
      noiseLevel: this.getNoiseLevel()
    };

    const result: SpeechRecognitionResult = {
      transcript,
      confidence,
      isFinal: true,
      timestamp: Date.now(),
      language: this.currentLanguage?.code || 'unknown',
      alternatives,
      metadata
    };

    // Check confidence threshold
    if (confidence >= this.recognitionConfig.confidenceThreshold) {
      this.emit('recognition:result', result);
      
      // Send audio metrics
      this.emit('audio:metrics', this.getAudioMetrics());
    }
  }

  private getAudioLevel(): number {
    // Mock implementation
    return Math.random() * 0.8;
  }

  private getNoiseLevel(): number {
    // Mock implementation
    return Math.random() * 0.3;
  }

  private getAudioMetrics(): AudioMetrics {
    return {
      volume: this.getAudioLevel(),
      signalToNoiseRatio: this.getSignalToNoiseRatio(),
      clipping: false,
      latency: 50, // Estimated latency for offline processing
      bufferUnderrun: false
    };
  }

  private getSignalToNoiseRatio(): number {
    // Mock implementation
    return 20 + Math.random() * 10;
  }

  private calculateSignalQuality(confidence: number): number {
    // Map confidence to signal quality (0-1)
    return Math.min(1, Math.max(0, confidence));
  }

  stopListening(): Promise<void> {
    this.isListening = false;
    this.audioBuffer = [];
    this.emit('recognition:stop');
    return Promise.resolve();
  }

  abortListening(): void {
    this.isListening = false;
    this.audioBuffer = [];
    this.emit('recognition:stop');
  }

  async detectLanguage(audioData: Float32Array): Promise<Language | null> {
    if (!this.worker) return null;

    return new Promise((resolve, reject) => {
      const detectionId = `detection_${Date.now()}_${Math.random()}`;
      
      const handleMessage = (e: MessageEvent) => {
        const { type, language, error, id } = e.data;
        
        if (id !== detectionId) return;

        switch (type) {
          case 'LANGUAGE_DETECTED':
            const langInfo = this.getLanguageInfo(language);
            this.worker?.removeEventListener('message', handleMessage);
            resolve(langInfo);
            break;
          case 'LANGUAGE_DETECT_ERROR':
            this.worker?.removeEventListener('message', handleMessage);
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({
        type: 'LANGUAGE_DETECT',
        data: { audio: audioData },
        id: detectionId
      });
    });
  }

  getCurrentLanguage(): Language | null {
    return this.currentLanguage;
  }

  getAvailableModels(): WhisperModel[] {
    return [...this.models.values()];
  }

  getCurrentModel(): ModelType | null {
    return this.currentModel;
  }

  getCapabilities(): {
    offlineCapable: boolean;
    realTimeCapable: boolean;
    accuracy: QualityLevel;
    supportedLanguages: number;
  } {
    return {
      offlineCapable: true,
      realTimeCapable: this.currentModel !== ModelType.WHISPER_LARGE,
      accuracy: this.currentModel ? this.models.get(this.currentModel)?.accuracy || QualityLevel.GOOD : QualityLevel.GOOD,
      supportedLanguages: 150 // Approximate number of Whisper-supported languages
    };
  }

  getMemoryUsage(): number {
    if (!this.currentModel) return 0;
    return this.models.get(this.currentModel)?.memoryUsage || 0;
  }

  dispose(): void {
    this.abortListening();
    this.cache.clear();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.removeAllListeners();
    this.isInitialized = false;
  }
}
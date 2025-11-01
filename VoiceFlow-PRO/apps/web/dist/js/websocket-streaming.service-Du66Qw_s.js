var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const WS_BASE_URL = "wss://api.aimlapi.com/v1/realtime";
const RECONNECT_DELAY_MS = 2e3;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 3e4;
class WebSocketStreamingService {
  constructor(apiKey) {
    __publicField(this, "ws", null);
    __publicField(this, "apiKey");
    __publicField(this, "reconnectAttempts", 0);
    __publicField(this, "reconnectTimer", null);
    __publicField(this, "pingTimer", null);
    __publicField(this, "isConnecting", false);
    __publicField(this, "isStreaming", false);
    __publicField(this, "eventHandlers", /* @__PURE__ */ new Map());
    __publicField(this, "audioContext", null);
    __publicField(this, "mediaRecorder", null);
    __publicField(this, "audioWorkletNode", null);
    this.apiKey = apiKey;
    this.initializeEventHandlers();
  }
  initializeEventHandlers() {
    this.eventHandlers.set("connected", /* @__PURE__ */ new Set());
    this.eventHandlers.set("disconnected", /* @__PURE__ */ new Set());
    this.eventHandlers.set("transcript", /* @__PURE__ */ new Set());
    this.eventHandlers.set("error", /* @__PURE__ */ new Set());
    this.eventHandlers.set("status", /* @__PURE__ */ new Set());
  }
  /**
   * Register event handler
   */
  on(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }
  /**
   * Unregister event handler
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  /**
   * Emit event to all registered handlers
   */
  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }
  /**
   * Connect to WebSocket server
   */
  async connect(options = {}) {
    var _a;
    if (((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }
    if (this.isConnecting) {
      console.log("WebSocket connection already in progress");
      return;
    }
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(WS_BASE_URL);
        url.searchParams.set("language", options.language || "en");
        url.searchParams.set("model", options.model || "#g1_nova-2-general");
        url.searchParams.set("punctuate", String(options.punctuate !== false));
        url.searchParams.set("diarize", String(options.diarize || false));
        url.searchParams.set("interim_results", String(options.interimResults !== false));
        this.ws = new WebSocket(url.toString());
        this.ws.onopen = () => {
          console.log("✅ WebSocket connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.sendMessage({
            type: "auth",
            token: this.apiKey
          });
          this.startPingInterval();
          this.emit("connected", { timestamp: Date.now() });
          resolve();
        };
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        this.ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          this.isConnecting = false;
          this.emit("error", { error: "WebSocket connection error", timestamp: Date.now() });
          reject(error);
        };
        this.ws.onclose = (event) => {
          console.log("🔌 WebSocket closed:", event.code, event.reason);
          this.isConnecting = false;
          this.stopPingInterval();
          this.emit("disconnected", { code: event.code, reason: event.reason, timestamp: Date.now() });
          if (event.code !== 1e3 && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.scheduleReconnect(options);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error("Failed to create WebSocket:", error);
        reject(error);
      }
    });
  }
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(options) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this.reconnectTimer = setTimeout(() => {
      this.connect(options).catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }
  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      var _a;
      if (((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
        this.sendMessage({ type: "ping" });
      }
    }, PING_INTERVAL_MS);
  }
  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  /**
   * Handle incoming WebSocket message
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "auth_success":
          console.log("✅ Authentication successful");
          this.emit("status", { status: "authenticated", timestamp: Date.now() });
          break;
        case "transcript":
        case "transcription":
          this.handleTranscript(message);
          break;
        case "error":
          console.error("Server error:", message.error);
          this.emit("error", { error: message.error, timestamp: Date.now() });
          break;
        case "pong":
          break;
        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }
  /**
   * Handle transcript message
   */
  handleTranscript(message) {
    const transcript = {
      text: message.text || message.transcript || "",
      isFinal: message.is_final || message.isFinal || false,
      confidence: message.confidence || 0.9,
      timestamp: message.timestamp || Date.now(),
      words: message.words || []
    };
    this.emit("transcript", transcript);
  }
  /**
   * Send message to WebSocket server
   */
  sendMessage(message) {
    var _a;
    if (((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket not connected");
    }
  }
  /**
   * Start streaming audio from MediaStream
   */
  async startStreaming(mediaStream) {
    if (this.isStreaming) {
      console.warn("Already streaming");
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected. Call connect() first.");
    }
    this.isStreaming = true;
    this.sendMessage({
      type: "start_listening",
      timestamp: Date.now()
    });
    await this.initializeAudioProcessing(mediaStream);
    this.emit("status", { status: "streaming", timestamp: Date.now() });
  }
  /**
   * Initialize audio processing and streaming
   */
  async initializeAudioProcessing(mediaStream) {
    this.audioContext = new AudioContext({ sampleRate: 16e3 });
    const source = this.audioContext.createMediaStreamSource(mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      if (!this.isStreaming) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmData = this.float32ToInt16(inputData);
      this.sendAudioChunk(pcmData);
    };
    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }
  /**
   * Convert Float32Array to Int16Array (PCM 16-bit)
   */
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return int16Array;
  }
  /**
   * Send audio chunk to server
   */
  sendAudioChunk(audioData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const base64Audio = this.arrayBufferToBase64(audioData.buffer);
    this.sendMessage({
      type: "audio_chunk",
      data: base64Audio,
      timestamp: Date.now()
    });
  }
  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  /**
   * Stop streaming audio
   */
  stopStreaming() {
    if (!this.isStreaming) return;
    this.isStreaming = false;
    this.sendMessage({
      type: "stop_listening",
      timestamp: Date.now()
    });
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.emit("status", { status: "stopped", timestamp: Date.now() });
  }
  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopStreaming();
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1e3, "Client disconnect");
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }
  /**
   * Check if connected
   */
  isConnected() {
    var _a;
    return ((_a = this.ws) == null ? void 0 : _a.readyState) === WebSocket.OPEN;
  }
  /**
   * Get connection state
   */
  getState() {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "unknown";
    }
  }
}
let streamingServiceInstance = null;
function getStreamingService(apiKey) {
  if (!streamingServiceInstance && apiKey) {
    streamingServiceInstance = new WebSocketStreamingService(apiKey);
  }
  if (!streamingServiceInstance) {
    throw new Error("Streaming service not initialized. Provide API key on first call.");
  }
  return streamingServiceInstance;
}
export {
  WebSocketStreamingService,
  getStreamingService
};
//# sourceMappingURL=websocket-streaming.service-Du66Qw_s.js.map

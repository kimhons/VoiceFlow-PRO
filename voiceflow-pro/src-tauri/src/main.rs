// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Manager, State, Window, AppHandle, WindowEvent, CustomMenuItem, Menu, MenuItem, Submenu, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, mpsc};
use anyhow::Result;
use uuid::Uuid;

// Import integration modules
mod integrations {
    pub mod voice_recognition;
    pub mod ai_text_processor;
}

// Re-export integration types for easy access
use integrations::voice_recognition::{
    VoiceRecognitionEngine, VoiceRecognitionConfig, VoiceEvent, SpeechRecognitionResult,
    get_supported_languages, is_language_supported, Language,
};
use integrations::ai_text_processor::{
    AITextProcessor, TextProcessingConfig, ProcessingRequest, ProcessingResult, 
    ProcessingContext, ToneType, ProcessingEvent, get_default_config_for_context,
};

use self::integrations::ai_text_processor::ProcessingOptions;

// Application state with integrated engines
#[derive(Debug, Clone)]
pub struct AppState {
    pub voice_engine: Arc<Mutex<Option<VoiceRecognitionEngine>>>,
    pub text_processor: Arc<Mutex<Option<AITextProcessor>>>,
    pub settings: Arc<Mutex<Settings>>,
    pub shortcuts: Arc<Mutex<HashMap<String, String>>>,
    pub event_handlers: Arc<Mutex<Vec<tokio::sync::mpsc::UnboundedReceiver<VoiceEvent>>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub language: String,
    pub voice_model: String,
    pub hotkey: String,
    pub auto_start: bool,
    pub theme: String,
    pub notifications: bool,
    pub voice_recognition: VoiceRecognitionSettings,
    pub text_processing: TextProcessingSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceRecognitionSettings {
    pub continuous: bool,
    pub interim_results: bool,
    pub max_alternatives: u32,
    pub confidence_threshold: f32,
    pub noise_reduction: bool,
    pub privacy_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextProcessingSettings {
    pub context: String,
    pub tone: String,
    pub aggressiveness: f32,
    pub remove_fillers: bool,
    pub enable_caching: bool,
    pub smart_punctuation: bool,
    pub auto_correct: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "en-US".to_string(),
            voice_model: "whisper-base".to_string(),
            hotkey: "CmdOrCtrl+Space".to_string(),
            auto_start: false,
            theme: "light".to_string(),
            notifications: true,
            voice_recognition: VoiceRecognitionSettings {
                continuous: true,
                interim_results: true,
                max_alternatives: 3,
                confidence_threshold: 0.7,
                noise_reduction: true,
                privacy_mode: false,
            },
            text_processing: TextProcessingSettings {
                context: "email".to_string(),
                tone: "professional".to_string(),
                aggressiveness: 0.7,
                remove_fillers: true,
                enable_caching: true,
                smart_punctuation: true,
                auto_correct: true,
            },
        }
    }
}

// Enhanced voice engine with integrated processing
#[derive(Debug, Clone)]
pub struct EnhancedVoiceEngine {
    pub voice_engine: Arc<Mutex<Option<VoiceRecognitionEngine>>>,
    pub text_processor: Arc<Mutex<Option<AITextProcessor>>>,
    pub current_session: Arc<Mutex<Option<String>>>,
    pub window: Window,
}

// Tauri Commands for voice recognition
#[tauri::command]
async fn initialize_voice_recognition(
    state: State<'_, AppState>,
    window: Window,
) -> Result<(), String> {
    let mut voice_engine_state = state.voice_engine.lock().await;
    
    let config = VoiceRecognitionConfig {
        language: "en-US".to_string(),
        continuous: true,
        interim_results: true,
        max_alternatives: 3,
        confidence_threshold: 0.7,
        noise_reduction: true,
        privacy_mode: false,
    };

    let (event_sender, event_receiver) = mpsc::unbounded_channel();
    
    // Store event receiver for the app state
    {
        let mut handlers = state.event_handlers.lock().await;
        handlers.push(event_receiver);
    }

    let engine = VoiceRecognitionEngine::new(config, event_sender);
    *voice_engine_state = Some(engine);

    // Start event handling loop
    let voice_engine_clone = state.voice_engine.clone();
    let window_clone = window.clone();
    tokio::spawn(async move {
        handle_voice_events(voice_engine_clone, window_clone).await;
    });

    Ok(())
}

#[tauri::command]
async fn start_voice_listening(
    state: State<'_, AppState>,
    window: Window,
) -> Result<(), String> {
    let voice_engine_state = state.voice_engine.lock().await;
    
    if let Some(ref engine) = *voice_engine_state {
        let mut engine_clone = engine.clone();
        tokio::spawn(async move {
            let _ = engine_clone.start_listening().await;
        });
        
        let _ = window.emit("voice-status", "listening");
    }
    
    Ok(())
}

#[tauri::command]
async fn stop_voice_listening(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let voice_engine_state = state.voice_engine.lock().await;
    
    if let Some(ref engine) = *voice_engine_state {
        let mut engine_clone = engine.clone();
        tokio::spawn(async move {
            let _ = engine_clone.stop_listening().await;
        });
    }
    
    Ok(())
}

#[tauri::command]
async fn process_speech_with_ai(
    transcript: String,
    state: State<'_, AppState>,
    window: Window,
) -> Result<ProcessingResult, String> {
    let text_processor_state = state.text_processor.lock().await;
    
    // Send transcript to frontend
    let _ = window.emit("speech-transcript", transcript.clone());
    
    if let Some(ref processor) = *text_processor_state {
        let request = ProcessingRequest {
            id: Uuid::new_v4().to_string(),
            text: transcript,
            context: ProcessingContext::Email, // Could be configurable
            tone: ToneType::Professional,
            options: ProcessingOptions {
                aggressiveness: 0.7,
                remove_fillers: true,
                preserve_formatting: false,
                smart_punctuation: true,
                auto_correct: true,
            },
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let result = processor.process_text(request).await?;
        
        // Send processed result to frontend
        let _ = window.emit("voice-response", result.processed_text.clone());
        
        Ok(result)
    } else {
        // Fallback if text processor not initialized
        let fallback_result = ProcessingResult {
            id: Uuid::new_v4().to_string(),
            original_text: transcript.clone(),
            processed_text: transcript,
            changes_made: Vec::new(),
            confidence_score: 1.0,
            processing_time_ms: 0,
            context_used: ProcessingContext::Email,
            tone_applied: ToneType::Professional,
            metadata: integrations::ai_text_processor::ProcessingMetadata {
                readability_before: 0.0,
                readability_after: 0.0,
                word_count_before: 0,
                word_count_after: 0,
                sentences_processed: 0,
                errors_corrected: 0,
                filler_words_removed: 0,
            },
        };
        
        let _ = window.emit("voice-response", fallback_result.processed_text.clone());
        Ok(fallback_result)
    }
}

// Tauri Commands for text processing
#[tauri::command]
async fn initialize_text_processor(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut text_processor_state = state.text_processor.lock().await;
    
    let config = get_default_config_for_context(ProcessingContext::Email);
    let (event_sender, _event_receiver) = mpsc::unbounded_channel();
    
    let processor = AITextProcessor::new(config, event_sender);
    *text_processor_state = Some(processor);

    Ok(())
}

#[tauri::command]
async fn process_text(
    text: String,
    context: String,
    tone: String,
    state: State<'_, AppState>,
) -> Result<ProcessingResult, String> {
    let text_processor_state = state.text_processor.lock().await;
    
    if let Some(ref processor) = *text_processor_state {
        let processing_context = match context.as_str() {
            "email" => ProcessingContext::Email,
            "code" => ProcessingContext::Code,
            "document" => ProcessingContext::Document,
            "social" => ProcessingContext::Social,
            "formal" => ProcessingContext::Formal,
            "casual" => ProcessingContext::Casual,
            "technical" => ProcessingContext::Technical,
            "creative" => ProcessingContext::Creative,
            _ => ProcessingContext::Email,
        };

        let tone_type = match tone.as_str() {
            "professional" => ToneType::Professional,
            "friendly" => ToneType::Friendly,
            "formal" => ToneType::Formal,
            "casual" => ToneType::Casual,
            "empathetic" => ToneType::Empathetic,
            "confident" => ToneType::Confident,
            "persuasive" => ToneType::Persuasive,
            "neutral" => ToneType::Neutral,
            _ => ToneType::Professional,
        };

        let request = ProcessingRequest {
            id: Uuid::new_v4().to_string(),
            text,
            context: processing_context,
            tone: tone_type,
            options: ProcessingOptions {
                aggressiveness: 0.7,
                remove_fillers: true,
                preserve_formatting: false,
                smart_punctuation: true,
                auto_correct: true,
            },
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let result = processor.process_text(request).await?;
        Ok(result)
    } else {
        Err("Text processor not initialized".to_string())
    }
}

#[tauri::command]
async fn get_supported_languages_tauri() -> Result<Vec<Language>, String> {
    Ok(get_supported_languages())
}

#[tauri::command]
async fn is_language_supported_tauri(language_code: String) -> Result<bool, String> {
    Ok(is_language_supported(&language_code))
}

// Original Tauri commands (updated)
#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let settings = state.settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
async fn update_settings(new_settings: Settings, state: State<'_, AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().await;
    *settings = new_settings;
    Ok(())
}

#[tauri::command]
async fn get_voice_status(state: State<'_, AppState>) -> Result<HashMap<String, serde_json::Value>, String> {
    let voice_engine_state = state.voice_engine.lock().await;
    
    let mut status = HashMap::new();
    if let Some(ref engine) = *voice_engine_state {
        let engine_status = engine.get_status();
        status.insert("is_listening".to_string(), serde_json::Value::Bool(engine_status.is_listening));
        status.insert("engine_type".to_string(), serde_json::Value::String(engine_status.engine_type));
        status.insert("session_id".to_string(), serde_json::Value::String(engine_status.session_id));
        status.insert("language".to_string(), serde_json::Value::String(engine_status.config.language));
    } else {
        status.insert("is_listening".to_string(), serde_json::Value::Bool(false));
        status.insert("engine_type".to_string(), serde_json::Value::String("none".to_string()));
    }
    
    Ok(status)
}

#[tauri::command]
async fn register_global_shortcut(shortcut: String, action: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut shortcuts = state.shortcuts.lock().await;
    shortcuts.insert(shortcut, action);
    Ok(())
}

#[tauri::command]
async fn get_app_info() -> Result<HashMap<String, String>, String> {
    let mut info = HashMap::new();
    info.insert("name".to_string(), "VoiceFlow Pro".to_string());
    info.insert("version".to_string(), "1.0.0".to_string());
    info.insert("platform".to_string(), std::env::consts::OS.to_string());
    info.insert("description".to_string(), "Advanced cross-platform voice productivity assistant".to_string());
    Ok(info)
}

// Event handling functions
async fn handle_voice_events(
    voice_engine_state: Arc<Mutex<Option<VoiceRecognitionEngine>>>,
    window: Window,
) {
    // This would handle voice events from the voice recognition engine
    // For now, we'll simulate some events
    
    let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(100));
    
    loop {
        interval.tick().await;
        
        // Simulate voice events
        let _ = window.emit("audio-metrics", serde_json::json!({
            "volume": 0.5,
            "signal_to_noise_ratio": 0.8,
            "clipping": false,
            "latency": 150
        }));
    }
}

fn create_menu() -> Menu {
    let macos = std::env::consts::OS == "macos";
    
    let app_menu = if macos {
        Submenu::new(
            &"VoiceFlow Pro",
            Menu::new()
                .add_native_item(MenuItem::About("VoiceFlow Pro".to_string()))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Services)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Hide)
                .add_native_item(MenuItem::HideOthers)
                .add_native_item(MenuItem::ShowAll)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        )
    } else {
        Submenu::new(
            "File",
            Menu::new()
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        )
    };

    let voice_menu = Submenu::new(
        "Voice",
        Menu::new()
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("start_listening", "Start Listening"))
            .add_item(CustomMenuItem::new("stop_listening", "Stop Listening")),
    );

    let view_menu = Submenu::new(
        "View",
        Menu::new()
            .add_native_item(MenuItem::EnterFullScreen)
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::Reload),
    );

    let window_menu = Submenu::new(
        "Window",
        Menu::new()
            .add_native_item(MenuItem::Minimize)
            .add_native_item(MenuItem::Zoom),
    );

    let help_menu = Submenu::new(
        "Help",
        Menu::new()
            .add_native_item(MenuItem::About("VoiceFlow Pro".to_string())),
    );

    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(voice_menu)
        .add_submenu(view_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu)
}

fn create_system_tray() -> SystemTray {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "Show Window"))
        .add_item(CustomMenuItem::new("hide", "Hide Window"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("start_listening", "🎤 Start Listening"))
        .add_item(CustomMenuItem::new("stop_listening", "⏹️ Stop Listening"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("settings", "⚙️ Settings"))
        .add_item(CustomMenuItem::new("quit", "🚪 Quit"));

    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(event: SystemTrayEvent, app: &AppHandle) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            if let Some(window) = app.get_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "show" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.hide();
                }
            }
            "start_listening" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.emit("tray-action", "start_listening");
                }
            }
            "stop_listening" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.emit("tray-action", "stop_listening");
                }
            }
            "settings" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.emit("tray-action", "settings");
                }
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        _ => {}
    }
}

fn handle_window_event(event: WindowEvent, app: &AppHandle) {
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            if let Some(window) = app.get_window("main") {
                let _ = window.hide();
                api.prevent_close();
            }
        }
        _ => {}
    }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .menu(create_menu())
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .on_window_event(handle_window_event)
        .manage(AppState {
            voice_engine: Arc::new(Mutex::new(None)),
            text_processor: Arc::new(Mutex::new(None)),
            settings: Arc::new(Mutex::new(Settings::default())),
            shortcuts: Arc::new(Mutex::new(HashMap::new())),
            event_handlers: Arc::new(Mutex::new(Vec::new())),
        })
        .invoke_handler(tauri::generate_handler![
            // Voice recognition commands
            initialize_voice_recognition,
            start_voice_listening,
            stop_voice_listening,
            
            // Text processing commands
            initialize_text_processor,
            process_text,
            process_speech_with_ai,
            
            // Language commands
            get_supported_languages_tauri,
            is_language_supported_tauri,
            
            // Original commands
            get_settings,
            update_settings,
            get_voice_status,
            register_global_shortcut,
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
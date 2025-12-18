# Frontend Integration Guide

**Purpose**: Complete integration reference for frontend developers to communicate with the MainController backend system.

**Last Updated**: 2025-11-08  
**Backend Version**: 2.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Server Architecture](#server-architecture)
3. [Connection Setup](#connection-setup)
4. [API Endpoints (HTTP/FastAPI)](#api-endpoints-httpfastapi)
5. [Socket.IO Events](#socketio-events)
6. [Session State Tracking](#session-state-tracking)
7. [High-Level Program Flow](#high-level-program-flow)
8. [Integration Workflows](#integration-workflows)
9. [Error Handling](#error-handling)
10. [Testing with Web UI](#testing-with-web-ui)

---

## System Overview

### What This Backend Does

The backend system manages a **food waste data collection workflow** for airline meal trays:

1. **Streams live camera frames** to frontend (RGB + Depth from Orbbec camera)
2. **Captures specific frames** at different food consumption levels (100%, 90%, ..., 10%)
3. **Runs CV model inference** to detect dishes on the tray
4. **Accepts user corrections** for dish bounding boxes
5. **Persists all data** to disk and JSON state file

### Key Technologies

- **FastAPI** (Port 8000): Handles HTTP POST requests for control commands
- **Flask-SocketIO** (Port 5000): Real-time bidirectional communication for frame streaming
- **Threading**: Background processing for frame capture and model inference
- **JSON State File**: `session_data/current_session_data.json` - persistent session state

---

## Server Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser/React/etc)          │
│  ┌──────────────────────────┐  ┌───────────────────────┐   │
│  │  HTTP Client (fetch/axios)│  │ Socket.IO Client      │   │
│  └────────────┬─────────────┘  └──────────┬────────────┘   │
└───────────────┼────────────────────────────┼────────────────┘
                │                             │
                │ HTTP POST                   │ WebSocket/Polling
                │ (Control Commands)          │ (Live Frame Stream)
                │                             │
┌───────────────┼────────────────────────────┼────────────────┐
│               ▼                             ▼                │
│  ┌───────────────────────┐    ┌─────────────────────────┐  │
│  │  FastAPI Server       │    │  Flask-SocketIO Server  │  │
│  │  (Port 8000)          │    │  (Port 5000)            │  │
│  │  - /post_request      │    │  - emit('stream_frames')│  │
│  └──────────┬────────────┘    │  - emit('model_results')│  │
│             │                  └────────────┬────────────┘  │
│             │                               │                │
│             └───────────┬───────────────────┘                │
│                         ▼                                    │
│              ┌──────────────────────┐                        │
│              │  MainController      │                        │
│              │  - Request Queue     │                        │
│              │  - Worker Thread     │                        │
│              │  - Session Manager   │                        │
│              └─────────┬────────────┘                        │
│                        │                                     │
│         ┌──────────────┼──────────────┐                     │
│         ▼              ▼               ▼                     │
│  ┌─────────────┐ ┌──────────┐ ┌─────────────────┐          │
│  │FrameCapture │ │CV Model  │ │Session JSON     │          │
│  │(Camera)     │ │Inference │ │current_session  │          │
│  └─────────────┘ └──────────┘ │_data.json       │          │
│                                └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                        Backend System
```

### Thread Model

```
Main Thread
    │
    ├─> FastAPI Thread (daemon)
    │       └─> Handles HTTP POST /post_request
    │
    ├─> SocketIO Thread (daemon)
    │       └─> Handles WebSocket connections
    │
    └─> MainController
            └─> Request Handler Worker Thread (daemon)
                    ├─> Processes: start_streaming (blocking)
                    ├─> Processes: stop_streaming (non-blocking)
                    │       └─> Spawns: Wait & Inference Thread
                    │               ├─> Polls for frame data
                    │               ├─> Runs model inference
                    │               └─> Emits results via SocketIO
                    └─> Processes: user_dish_mapping (blocking)
```

---

## Connection Setup

### Server Configuration

**Default Configuration** (in `server.py`):

```python
# FastAPI Server
HOST = "10.0.0.99"
FASTAPI_PORT = 8000

# SocketIO Server
SOCKETIO_PORT = 5000
```

### Frontend Connection Code

#### 1. Connect to Socket.IO (MUST DO FIRST)

```javascript
// Socket.IO connection
const BACKEND_IP = "10.0.0.99";
const SOCKETIO_PORT = 5000;
const socketUrl = `http://${BACKEND_IP}:${SOCKETIO_PORT}`;

const socket = io(socketUrl, {
    transports: ['polling'],  // Start with polling (upgrades to WebSocket if available)
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// Listen for connection
socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
});

socket.on('welcome', (data) => {
    console.log('Welcome message:', data);
    // {
    //     "message": "Connected to Socket.IO server",
    //     "server_time": "2025-11-08T...",
    //     "client_id": "abc123..."
    // }
});
```

#### 2. FastAPI Endpoint (for sending commands)

```javascript
const FASTAPI_PORT = 8000;
const apiUrl = `http://${BACKEND_IP}:${FASTAPI_PORT}/post_request`;

async function sendCommand(requestData) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;  // Status 200 = success
}
```

---

## API Endpoints (HTTP/FastAPI)

### Endpoint: `POST /post_request`

**URL**: `http://10.0.0.99:8000/post_request`

**Purpose**: Send control commands to MainController (start/stop streaming, submit dish mappings)

**Method**: POST

**Content-Type**: `application/json`

**Response**: 
- **200 OK**: Request accepted and queued
- **500 Internal Server Error**: Request parsing/processing failed

---

### Request Type 1: `start_streaming`

**Purpose**: Start live camera streaming. On first call, initializes session with flight/menu data.

#### Request Structure (First Time - With/Without Session Data - Subsequent Calls - Resume Streaming)

```json
{
    "type": "start_streaming",
    "data": {
        "flight_details": {
            "flight_number": "SV0590"
        },
        "menu_details": {
            "menu_code": "SV120",
            "menu_item_count": 6,
            "menu_items": [
                {
                    "dish_id": "SLF12324",
                    "dish_name": "SALAD POTATO BABY/BEANS KALE PO"
                },
                {
                    "dish_id": "ENFJF2328",
                    "dish_name": "SEABASS FILLET SAYADIA W/SAUCE PO"
                },
                {
                    "dish_id": "SAUCE2208",
                    "dish_name": "SAUCE TAHINA (30GR) (KFOLL) PO"
                },
                {
                    "dish_id": "HDV1W2320",
                    "dish_name": "HDV: SALMON BALIK SMOKED/CHEESE PO"
                },
                {
                    "dish_id": "ENFJM2317",
                    "dish_name": "BEEF STEAK GRILLED W/TARRAGON PO"
                },
                {
                    "dish_id": "ENYP2412C",
                    "dish_name": "CHICKEN BIRYANI W/RICE-GARLIC YOGURT PO"
                }
            ]
        }
    }
}
```

**Field Specifications**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Must be `"start_streaming"` |
| `data` | object | ✅ | Container for flight/menu data |
| `data.flight_details` | object | ✅ (first time) | Flight information |
| `data.flight_details.flight_number` | string | ✅ | Flight identifier |
| `data.menu_details` | object | ✅ (first time) | Menu configuration |
| `data.menu_details.menu_code` | string | ✅ | Menu identifier |
| `data.menu_details.menu_item_count` | integer | ✅ | Total number of dishes |
| `data.menu_details.menu_items` | array | ✅ | List of dishes |
| `data.menu_details.menu_items[].dish_id` | string | ✅ | Unique dish identifier |
| `data.menu_details.menu_items[].dish_name` | string | ✅ | Human-readable dish name |


---

### Request Type 2: `stop_streaming`

**Purpose**: Stop camera streaming, capture a specific frame, and automatically run model inference.

#### Request Structure

```json
{
    "type": "stop_streaming",
    "data": {
        "frame_name": "20251107_203246_730_0",
        "food_level": 100
    }
}
```

**Field Specifications**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Must be `"stop_streaming"` |
| `data.frame_name` | string | ✅ | Frame identifier from `stream_frames` event |
| `data.food_level` | integer | ✅ | Food consumption level (100, 90, 80, ..., 10) |

**Valid `food_level` Values**: 100, 90, 80, 70, 60, 50, 40, 30, 20, 10

#### Response

**HTTP Response**: `200 OK` (no body)

**Socket.IO Emission**: `model_results` event emitted after inference completes (~1-5 seconds later)

---

### Request Type 3: `user_dish_mapping`

**Purpose**: Submit user-verified/corrected dish bounding boxes after reviewing model results.

#### Request Structure

```json
{
    "type": "user_dish_mapping",
    "data": {
        "flight_details": {
            "flight_number": "SV0590"
        },
        "menu_details": {
            "menu_code": "SV120"
        },
        "food_level": 100,
        "dish_results": [
            {
                "dish_id": "SLF12324",
                "dish_bbox": [120, 150, 80, 90]
            },
            {
                "dish_id": "ENFJF2328",
                "dish_bbox": [250, 140, 85, 95]
            },
            {
                "dish_id": "SAUCE2208",
                "dish_bbox": []
            },
            {
                "dish_id": "HDV1W2320",
                "dish_bbox": [120, 280, 82, 92]
            },
            {
                "dish_id": "ENFJM2317",
                "dish_bbox": [250, 275, 78, 85]
            },
            {
                "dish_id": "ENYP2412C",
                "dish_bbox": [380, 285, 76, 87]
            }
        ]
    }
}
```

**Field Specifications**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Must be `"user_dish_mapping"` |
| `data.flight_details` | object | ✅ | Flight information |
| `data.flight_details.flight_number` | string | ✅ | Flight identifier |
| `data.menu_details` | object | ✅ | Menu configuration |
| `data.menu_details.menu_code` | string | ✅ | Menu identifier |
| `data.food_level` | integer | ✅ | Food level to update |
| `data.dish_results` | array | ✅ | **Must match `menu_item_count` length** |
| `data.dish_results[].dish_id` | string | ✅ | Explicit dish ID (must exist in menu) |
| `data.dish_results[].dish_bbox` | array | ✅ | `[x, y, width, height]` or `[]` if not detected |

**Bounding Box Format**:
- `[x, y, width, height]` - Detected dish
- `[]` - Dish not present/not detected

**Important**:
- `dish_results` length MUST equal `menu_item_count`
- All `dish_id` values MUST match exactly with `menu_items[].dish_id` from session
- No duplicate `dish_id` values allowed
- Empty bbox `[]` indicates dish is missing/eaten

#### Response

**HTTP Response**: `200 OK` (no body)

**No Socket.IO Emission** - Silent success

**Validation Errors** (logged to backend console):
```
ERROR: "Dish results count mismatch: expected 6, got 4"
ERROR: "dish_id 'INVALID' not found in menu"
ERROR: "Duplicate dish_id 'SLF12324' in dish_results"
ERROR: "Missing dish_ids in results: {'SAUCE2208'}"
```

---

## Socket.IO Events

### Event: `welcome` (Server → Client)

**Trigger**: Client connects to Socket.IO server

**Purpose**: Confirm connection established

**Data Structure**:

```json
{
    "message": "Connected to Socket.IO server",
    "server_time": "2025-11-08T14:30:22.123456",
    "client_id": "abc123xyz456"
}
```

**Frontend Handler**:

```javascript
socket.on('welcome', (data) => {
    console.log('Connected to backend:', data);
});
```

---

### Event: `stream_frames` (Server → Client)

**Trigger**: After `start_streaming` request sent

**Frequency**: Continuous (30-60 FPS depending on camera performance)

**Purpose**: Live camera frame stream for user to position tray

**Data Structure**:

```json
{
    "title": "send_frames",
    "data": {
        "frame_name": "20251107_203246_730_0",
        "frame_data": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD..."
    }
}
```

**Field Specifications**:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Always `"send_frames"` |
| `data.frame_name` | string | Unique frame identifier (format: `YYYYMMDD_HHMMSS_session_counter`) |
| `data.frame_data` | string | Base64-encoded JPEG image |

**Frontend Handler**:

```javascript
socket.on('stream_frames', (data) => {
    const message = typeof data === 'string' ? JSON.parse(data) : data;
    
    const frameName = message.data.frame_name;
    const frameData = message.data.frame_data;  // Base64 string
    
    // Display in canvas/img tag
    const img = new Image();
    img.onload = function() {
        const canvas = document.getElementById('frameCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/jpeg;base64,${frameData}`;
    
    // Store frame_name for stop_streaming request
    currentFrameName = frameName;
});
```

**Important Notes**:
- Frames are sent continuously until `stop_streaming` is called
- Base64 data can be large (~50KB-200KB per frame)
- Frame rate depends on camera and network performance
- Always store the latest `frame_name` to use in `stop_streaming` request

---

### Event: `model_results` (Server → Client)

**Trigger**: After `stop_streaming` request, when model inference completes (~1-5 seconds)

**Purpose**: Deliver CV model detection results to frontend for user review

**Data Structure**:

```json
{
    "type": "model_results",
    "data": {
        "frame_name": "20251107_203246_730_0",
        "food_level": 100,
        "missing_dishes": 1,
        "cv_model_results": {
            "total_dishes": 6,
            "detected_dishes": 5,
            "detection_results": [
                [755.33, 288.86, 1116.94, 611.73],
                [672.59, 98.45, 923.27, 320.98],
                [494.55, 117.11, 687.89, 314.54],
                [920.43, 89.11, 1132.65, 298.73],
                [519.61, 402.18, 756.89, 593.25]
            ]
        }
    }
}
```

**Field Specifications**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"model_results"` |
| `data.frame_name` | string | Frame identifier that was processed |
| `data.food_level` | integer | Food level that was captured |
| `data.missing_dishes` | integer | `total_dishes - detected_dishes` |
| `data.cv_model_results` | object | Model inference output |
| `data.cv_model_results.total_dishes` | integer | Expected dish count from menu |
| `data.cv_model_results.detected_dishes` | integer | Number of dishes detected by model |
| `data.cv_model_results.detection_results` | array | Bounding boxes `[x, y, width, height]` |

**Frontend Handler**:

```javascript
socket.on('model_results', (data) => {
    const message = typeof data === 'string' ? JSON.parse(data) : data;
    
    const frameName = message.data.frame_name;
    const foodLevel = message.data.food_level;
    const cvResults = message.data.cv_model_results;
    
    console.log(`Model detected ${cvResults.detected_dishes}/${cvResults.total_dishes} dishes`);
    
    // Display bounding boxes on canvas
    const detectionResults = cvResults.detection_results;
    detectionResults.forEach((bbox, index) => {
        const [x, y, w, h] = bbox;
        drawBoundingBox(x, y, w, h, `Dish ${index + 1}`);
    });
    
    // Allow user to review/correct results
    showDishMappingUI(foodLevel, detectionResults);
});
```

---

## Session State Tracking

### Session JSON File

**Location**: `session_data/current_session_data.json`

**Purpose**: Persistent state storage for tracking data collection progress across all food levels

**Access**: Read-only from frontend (via file system or future API endpoint)

### JSON Structure Overview

```json
{
    "flight_details": { ... },
    "menu_details": { ... },
    "food_level_results": [ ... ],
    "model_training_results": { ... }
}
```

### Complete Example

```json
{
    "flight_details": {
        "flight_number": "SV0590"
    },
    "menu_details": {
        "menu_code": "SV120",
        "menu_item_count": 6,
        "menu_items": [
            {
                "dish_id": "SLF12324",
                "dish_name": "SALAD POTATO BABY/BEANS KALE PO"
            },
            {
                "dish_id": "ENFJF2328",
                "dish_name": "SEABASS FILLET SAYADIA W/SAUCE PO"
            }
            // ... 4 more dishes
        ]
    },
    "food_level_results": [
        {
            "food_level": 100,
            "frame_name": "20251107_203246_730_0",
            "timestamp": "2025-11-07 20:32:55.144",
            "captured_at": "2025-11-07T20:32:55.144300",
            "rgb_file": "data_to_process/100/rgb/20251107_203246_730_0.jpg",
            "depth_file": "data_to_process/100/depth/20251107_203246_730_0.npz",
            "status": "pending",
            "cv_model_results": {
                "total_dishes": 6,
                "detected_dishes": 5,
                "detection_results": [
                    [755.33, 288.86, 1116.94, 611.73],
                    [672.59, 98.45, 923.27, 320.98]
                    // ... 3 more bboxes
                ]
            },
            "dish_results": [
                {
                    "dish_id": "SLF12324",
                    "dish_name": "SALAD POTATO BABY/BEANS KALE PO",
                    "model_results": {
                        "model_detection": true,
                        "dish_bbox": [120, 150, 80, 90]
                    }
                },
                {
                    "dish_id": "ENFJF2328",
                    "dish_name": "SEABASS FILLET SAYADIA W/SAUCE PO",
                    "model_results": {
                        "model_detection": false,
                        "dish_bbox": []
                    }
                }
                // ... 4 more dishes
            ]
        }
        // ... entries for food_level: 90, 80, 70, 60, 50, 40, 30, 20, 10
    ],
    "model_training_results": {
        "data_collection_status": false,
        "model_training_completed": false
    }
}
```

### Field Reference

#### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `flight_details` | object | Flight information (set once at start) |
| `menu_details` | object | Menu configuration (set once at start) |
| `food_level_results` | array | Results for each food level (grows from 0 to 10 entries) |
| `model_training_results` | object | Model training status (future use) |

#### `food_level_results[]` Entry Fields

| Field | Type | Description | Populated When |
|-------|------|-------------|----------------|
| `food_level` | integer | 100, 90, 80, ..., 10 | On `stop_streaming` |
| `frame_name` | string | Unique frame identifier | On `stop_streaming` |
| `timestamp` | string | Frame capture time | On `stop_streaming` |
| `captured_at` | string | ISO 8601 timestamp | On `stop_streaming` |
| `rgb_file` | string | Path to RGB image | On `stop_streaming` |
| `depth_file` | string | Path to depth data | On `stop_streaming` |
| `status` | string | "pending" (future: "completed") | On `stop_streaming` |
| `cv_model_results` | object | Model inference output | After inference completes |
| `dish_results` | array | User-verified dish mappings | On `user_dish_mapping` |

#### `dish_results[]` Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `dish_id` | string | Explicit dish identifier from menu |
| `dish_name` | string | Human-readable name (copied from menu) |
| `model_results.model_detection` | boolean | `true` if dish detected, `false` if missing |
| `model_results.dish_bbox` | array | `[x, y, width, height]` or `[]` if not detected |

### Using Session State for Progress Tracking

#### Check if Session Initialized

```javascript
// Fetch session JSON
const response = await fetch('http://10.0.0.99:8000/session_data/current_session_data.json');
const sessionData = await response.json();

if (sessionData.flight_details && sessionData.menu_details) {
    console.log('✅ Session initialized');
    console.log('Flight:', sessionData.flight_details.flight_number);
    console.log('Menu:', sessionData.menu_details.menu_code);
} else {
    console.log('⚠️ Session not initialized - need to call start_streaming with data');
}
```

#### Track Food Level Progress

```javascript
const foodLevelResults = sessionData.food_level_results;
const completedLevels = foodLevelResults.length;  // 0 to 10

console.log(`Progress: ${completedLevels}/10 food levels captured`);

// Check which levels are done
const completedFoodLevels = foodLevelResults.map(entry => entry.food_level);
console.log('Completed:', completedFoodLevels);  // e.g., [100, 90, 80]

// Find next level to capture
const allLevels = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const remainingLevels = allLevels.filter(level => !completedFoodLevels.includes(level));
console.log('Remaining:', remainingLevels);  // e.g., [70, 60, 50, 40, 30, 20, 10]
```

#### Check if Dish Mapping Completed

```javascript
// Check if specific food level has user-verified dish results
const foodLevel = 100;
const entry = sessionData.food_level_results.find(e => e.food_level === foodLevel);

if (entry && entry.dish_results) {
    console.log('✅ Dish mapping completed for level', foodLevel);
} else if (entry && entry.cv_model_results) {
    console.log('⚠️ Model results available, waiting for user verification');
} else {
    console.log('❌ Food level not yet captured');
}
```

---

## High-Level Program Flow

### System Initialization

```
1. server.py starts
   │
   ├─> Creates Flask app + SocketIO (Port 5000)
   ├─> Creates FastAPI app (Port 8000)
   ├─> Initializes MainController
   │       ├─> Loads session JSON (if exists)
   │       ├─> Initializes segmentation model
   │       ├─> Starts request_handler_worker thread
   │       └─> Ready to accept requests
   │
   ├─> Starts SocketIO thread (daemon)
   └─> Starts FastAPI thread (daemon)
```

### Request Processing Flow

```
Frontend HTTP POST /post_request
   ↓
FastAPI receives request
   ↓
FastAPI calls main_controller.submit_request(request)
   ↓
MainController adds request to Queue
   ↓ (immediately returns 200 OK)
   
[Background Thread: request_handler_worker]
   ↓
Dequeue request from Queue
   ↓
Switch on request["type"]:
   │
   ├─> "start_streaming"
   │       ├─> If flight_details provided:
   │       │   └─> Update session JSON (atomic write)
   │       └─> Start FrameCapture streaming
   │           └─> SocketIO emits "stream_frames" continuously
   │
   ├─> "stop_streaming"
   │       ├─> Stop FrameCapture streaming
   │       ├─> Spawn background thread: _wait_for_frame_and_run_inference
   │       │       ├─> Poll FrameCapture for frame metadata (30s timeout)
   │       │       ├─> Run model_inference(frame_name, food_level)
   │       │       │   └─> Load RGB image, run CV model, get bboxes
   │       │       ├─> Update session JSON with cv_model_results (atomic write)
   │       │       └─> SocketIO emit "model_results"
   │       └─> Continue processing other requests (non-blocking)
   │
   └─> "user_dish_mapping"
           ├─> Validate dish_results (count, dish_id, completeness)
           ├─> Transform with explicit dish_id matching
           ├─> Update session JSON with dish_results (atomic write)
           └─> Silent success (no SocketIO emission)
```

### Complete Data Collection Workflow

```
Session Start
   ↓
1. Frontend: POST start_streaming (with flight/menu data)
   Backend: Initialize session JSON
   Backend: Start camera streaming
   Backend: SocketIO emit "stream_frames" continuously
   ↓
2. Frontend: User positions tray in camera view
   ↓
3. Frontend: POST stop_streaming (frame_name, food_level=100)
   Backend: Capture frame, relocate to data_to_process/100/
   Backend: Run model inference
   Backend: SocketIO emit "model_results"
   Backend: Update session JSON (cv_model_results)
   ↓
4. Frontend: Display bounding boxes, allow user to review/correct
   ↓
5. Frontend: POST user_dish_mapping (food_level=100, dish_results)
   Backend: Validate and save to session JSON (dish_results)
   ↓
6. Repeat steps 1-5 for food_level: 90, 80, 70, 60, 50, 40, 30, 20, 10
   ↓
Data Collection Complete (10 food levels captured)
```

### MainController Internal Flow

```
MainController.__init__()
   ├─> Setup logging
   ├─> Create session_lock (threading.Lock)
   ├─> Load/initialize session JSON
   ├─> Initialize segmentation model (MaskRCNNBowlSegmentation)
   ├─> Initialize FrameCapture (camera interface)
   ├─> Create request_queue (Queue)
   ├─> Start request_handler_worker thread (daemon)
   └─> Ready

Request Handler Worker Thread (infinite loop):
   while True:
       request = request_queue.get()  # Blocking wait
       
       if request["type"] == "start_streaming":
           if flight_details and menu_details provided:
               with session_lock:
                   Update session JSON
                   Atomic write to disk
           frame_capture.process_request(start_streaming)
           
       elif request["type"] == "stop_streaming":
           frame_capture.process_request(stop_streaming)
           Spawn thread: _wait_for_frame_and_run_inference()
           # Non-blocking - continues immediately
           
       elif request["type"] == "user_dish_mapping":
           with session_lock:
               Validate dish_results
               Update session JSON
               Atomic write to disk
       
       request_queue.task_done()
```

---

### Running Test UI

```bash
# Option 1: Open directly in browser
firefox tests/web_ui_tester/index.html

# Option 2: Serve with Python
+ web_ui venv
cd tests/web_ui_tester
python3 -m http.server 8080
# Open http://localhost:8080 in browser
```

### Test Scenarios

#### Scenario 1: Complete Data Collection Flow

1. Connect Socket.IO
2. Send `start_streaming` (with flight/menu data)
3. Verify frames appearing in viewer
4. Send `stop_streaming` (food_level=100)
5. Wait for `model_results` event
6. Verify bounding boxes displayed
7. Send `user_dish_mapping` (corrected results)
8. Repeat for remaining food levels (90-10)

#### Scenario 2: Resume After Interruption

1. Check `session_data/current_session_data.json`
2. Identify completed food levels
3. Resume from next level

#### Scenario 3: Error Testing

1. Send `user_dish_mapping` with wrong dish count (should fail validation)
2. Send `stop_streaming` before `start_streaming` (should fail)
3. Send invalid JSON (should return 500)

---

## Summary

### Key Points for Frontend Developers

1. **Always connect Socket.IO FIRST** before sending any commands
2. **Store `frame_name`** from `stream_frames` events to use in `stop_streaming`
3. **Wait for `model_results`** event after `stop_streaming` before allowing user actions
4. **Validate `dish_results`** locally before sending `user_dish_mapping`
5. **Use session JSON** to track progress and resume after interruptions
6. **Handle connection errors** gracefully with reconnection logic

### Request Order

```
✅ CORRECT ORDER:
1. Connect Socket.IO
2. POST start_streaming (with data, first time only)
3. POST stop_streaming (when user clicks capture)
4. Wait for model_results event
5. POST user_dish_mapping (after user review)
6. Repeat 2-5 for remaining food levels

❌ INCORRECT:
- Sending stop_streaming before start_streaming
- Sending commands before Socket.IO connected
- Not waiting for model_results before user_dish_mapping
```

### Data Flow Summary

```
Frontend                    Backend
   │                           │
   ├─ Socket.IO connect ──────>│
   │<─────── welcome ───────────┤
   │                           │
   ├─ POST start_streaming ───>│
   │                           ├─ Update session JSON
   │                           ├─ Start camera
   │<── stream_frames (loop) ──┤
   │<── stream_frames ──────────┤
   │<── stream_frames ──────────┤
   │                           │
   ├─ POST stop_streaming ────>│
   │                           ├─ Capture frame
   │                           ├─ Run model inference
   │                           ├─ Update session JSON
   │<──── model_results ────────┤
   │                           │
   ├─ POST user_dish_mapping ─>│
   │                           └─ Update session JSON
```

---

**End of Documentation**

For questions or issues, check:
- Backend logs (stdout)
- Session JSON (`session_data/current_session_data.json`)
- Test UI (`tests/web_ui_tester/index.html`)

**Version**: 2.0  
**Last Updated**: 2025-11-08


# API Flow and JSON Specifications

This document describes the complete flow of the application and the specific JSON payloads sent at each step.

---

## Overview

The application follows this general flow:
1. **Login** → Authenticate user
2. **System Details Form** → Enter flight/menu information
3. **Fetch Dishes** → Get menu dishes from API
4. **Camera Feed** → Stream camera, capture frames, and submit dish mappings

---

## Step 1: Login Flow

### Endpoint
- **URL**: `POST http://10.0.0.36:9080/auth/login`
- **Method**: `POST`
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

### Request JSON
```json
{
  "username": "admin@catrion.com",
  "password": "admin1234"
}
```

**Field Specifications**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Username or email address |
| `password` | string | ✅ | User password |

### Response JSON
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": 1,
    "username": "admin",
    "email": "admin@catrion.com",
    "full_name": "Administrator",
    "is_active": true,
    "is_admin": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Field Specifications**:
| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT token for authenticated requests |
| `token_type` | string | Token type (usually "bearer") |
| `user` | object | User information object |
| `user.user_id` | number | Unique user identifier |
| `user.username` | string | Username |
| `user.email` | string | Email address |
| `user.full_name` | string \| null | Full name (nullable) |
| `user.is_active` | boolean | Whether account is active |
| `user.is_admin` | boolean | Whether user has admin privileges |
| `user.created_at` | string | ISO 8601 timestamp of account creation |

### Error Responses

**401 Unauthorized**:
```json
{
  "detail": "Incorrect username/email or password"
}
```

**403 Forbidden**:
```json
{
  "detail": "Account is inactive. Please contact support."
}
```

**422 Unprocessable Entity**:
```json
{
  "detail": "Invalid input format"
}
```

**500 Internal Server Error**:
```json
{
  "detail": "Server error. Please try again later."
}
```

### Storage
After successful login:
- `access_token` is stored in `localStorage` with key `catrion_access_token`
- `user` object is stored in `localStorage` with key `catrion_user`

---

## Step 2: Get Current User (Optional)

### Endpoint
- **URL**: `GET http://10.0.0.36:9080/auth/me`
- **Method**: `GET`
- **Headers**: 
  ```json
  {
    "Authorization": "Bearer <access_token>",
    "Content-Type": "application/json"
  }
  ```

### Request
No request body (GET request)

### Response JSON
Same structure as the `user` object in login response:
```json
{
  "user_id": 1,
  "username": "admin",
  "email": "admin@catrion.com",
  "full_name": "Administrator",
  "is_active": true,
  "is_admin": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Step 3: Fetch Menu Dishes

### Endpoint
- **URL**: `GET http://10.0.0.36:9080/menus/{menu_code}/dishes`
- **Method**: `GET`
- **Example**: `GET http://10.0.0.36:9080/menus/SV120/dishes`
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

### Request
No request body (GET request)

### Response JSON
```json
[
  {
    "id": "SLF12324",
    "name": "SALAD POTATO BABY/BEANS KALE PO"
  },
  {
    "id": "ENFJF2328",
    "name": "SEABASS FILLET SAYADIA W/SAUCE PO"
  },
  {
    "id": "SAUCE2208",
    "name": "SAUCE TAHINA (30GR) (KFOLL) PO"
  },
  {
    "id": "HDV1W2320",
    "name": "HDV: SALMON BALIK SMOKED/CHEESE PO"
  },
  {
    "id": "ENFJM2317",
    "name": "BEEF STEAK GRILLED W/TARRAGON PO"
  },
  {
    "id": "ENYP2412C",
    "name": "CHICKEN BIRYANI W/RICE-GARLIC YOGURT PO"
  }
]
```

**Field Specifications**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique dish identifier |
| `name` | string | Human-readable dish name |

---

## Step 4: Camera Feed Flow

The camera feed uses **Socket.IO** for real-time communication and **HTTP POST** for control commands.

### Socket.IO Connection
- **URL**: `http://10.0.0.99:5000`
- **Transport**: WebSocket or polling

### HTTP API Endpoint
- **URL**: `POST http://10.0.0.99:8000/post_request`
- **Method**: `POST`
- **Headers**: 
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

---

## Step 4.1: Start Streaming

### Request Type: `start_streaming`

**Purpose**: Start live camera streaming and initialize session with flight/menu data.

### HTTP Request JSON
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

### Socket.IO Emission
The same JSON structure is also sent via Socket.IO:
```javascript
socket.emit('subscribe', {
  type: "start_streaming",
  data: { ... }
})
```

### Response
- **HTTP Response**: `200 OK` (no body)
- **Socket.IO Event**: `stream_frames` (emitted continuously)

### Socket.IO Event: `stream_frames`

**Purpose**: Receive live camera frames from the server.

**Event Data Format**:
```json
{
  "title": "send_frames",
  "data": {
    "frame_name": "20251107_203246_730_0",
    "frame_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**Alternative Format** (object with base_64_img):
```json
{
  "title": "send_frames",
  "data": {
    "frame_name": "20251107_203246_730_0",
    "frame_data": {
      "base_64_img": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  }
}
```

**Field Specifications**:
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Must be `"send_frames"` |
| `data` | object | Frame data container |
| `data.frame_name` | string | Unique frame identifier (store this for stop_streaming) |
| `data.frame_data` | string \| object | Base64-encoded image data (data URI or object) |

**Note**: Always store the latest `frame_name` to use in the `stop_streaming` request.

---

## Step 4.2: Stop Streaming

### Request Type: `stop_streaming`

**Purpose**: Stop camera streaming, capture a specific frame, and automatically run model inference.

### HTTP Request JSON
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
| `data` | object | ✅ | Container for frame and food level data |
| `data.frame_name` | string | ✅ | Frame identifier from `stream_frames` event |
| `data.food_level` | integer | ✅ | Food consumption level (100, 90, 80, 70, 60, 50, 40, 30, 20, 10) |

**Valid `food_level` Values**: 100, 90, 80, 70, 60, 50, 40, 30, 20, 10

### Socket.IO Emission
The same JSON structure is also sent via Socket.IO:
```javascript
socket.emit('subscribe', {
  type: "stop_streaming",
  data: {
    frame_name: "20251107_203246_730_0",
    food_level: 100
  }
})
```

### Response
- **HTTP Response**: `200 OK` (no body)
- **Socket.IO Event**: `model_results` (emitted after inference completes, ~1-5 seconds later)

### Socket.IO Event: `model_results`

**Purpose**: Receive model inference results with detected dish bounding boxes.

**Event Data Format**:
```json
{
  "food_level": 100,
  "frame_name": "20251107_203246_730_0",
  "timestamp": "2025-11-07T20:32:46.730Z",
  "captured_at": "2025-11-07T20:32:46.730Z",
  "rgb_file": "/path/to/rgb/image.jpg",
  "depth_file": "/path/to/depth/data.npy",
  "status": "pending",
  "cv_model_results": [
    {
      "index": 0,
      "bbox": [120, 150, 200, 240],
      "confidence": 0.95
    },
    {
      "index": 1,
      "bbox": [250, 140, 335, 235],
      "confidence": 0.87
    }
  ]
}
```

**Field Specifications**:
| Field | Type | Description |
|-------|------|-------------|
| `food_level` | integer | Food consumption level (100, 90, 80, ..., 10) |
| `frame_name` | string | Unique frame identifier |
| `timestamp` | string | Frame capture time |
| `captured_at` | string | ISO 8601 timestamp |
| `rgb_file` | string | Path to RGB image file |
| `depth_file` | string | Path to depth data file |
| `status` | string | Status ("pending" or "completed") |
| `cv_model_results` | array | Model detection results |
| `cv_model_results[].index` | integer | Detection index (0-based) |
| `cv_model_results[].bbox` | array | Bounding box `[x1, y1, x2, y2]` in pixel coordinates |
| `cv_model_results[].confidence` | number | Detection confidence score (0-1) |

---

## Step 4.3: User Dish Mapping

### Request Type: `user_dish_mapping`

**Purpose**: Submit user-verified/corrected dish bounding boxes after reviewing model results.

### HTTP Request JSON
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
| `data` | object | ✅ | Container for mapping data |
| `data.flight_details` | object | ✅ | Flight information |
| `data.flight_details.flight_number` | string | ✅ | Flight identifier |
| `data.menu_details` | object | ✅ | Menu configuration |
| `data.menu_details.menu_code` | string | ✅ | Menu identifier |
| `data.food_level` | integer | ✅ | Food consumption level (100, 90, 80, ..., 10) |
| `data.dish_results` | array | ✅ | Array of dish mappings (must match menu_item_count) |
| `data.dish_results[].dish_id` | string | ✅ | Unique dish identifier (must match menu_items) |
| `data.dish_results[].dish_bbox` | array | ✅ | Bounding box `[x, y, width, height]` or `[]` if not detected |

**Bounding Box Format**:
- **Detected**: `[x, y, width, height]` - Top-left corner coordinates and dimensions
- **Not Detected**: `[]` - Empty array

**Validation Rules**:
1. `dish_results` array length must equal `menu_item_count` from `start_streaming`
2. Each `dish_id` must match a `dish_id` from `menu_items` in `start_streaming`
3. All dishes from `menu_items` must be present in `dish_results`

### Response
- **HTTP Response**: `200 OK` (no body)
- **Socket.IO**: No event emitted (silent success)

---

## Complete Flow Diagram

```
1. User Login
   ↓
   POST /auth/login
   Request: { username, password }
   Response: { access_token, token_type, user }
   ↓
   Store: access_token, user in localStorage
   
2. System Details Form
   ↓
   User enters: airline, flightNumber, flightClass, menu
   ↓
   GET /menus/{menu}/dishes
   Response: [{ id, name }, ...]
   ↓
   Navigate to Camera Feed
   
3. Camera Feed - Start Streaming
   ↓
   POST /post_request (or Socket.IO emit 'subscribe')
   Request: {
     type: "start_streaming",
     data: {
       flight_details: { flight_number },
       menu_details: { menu_code, menu_item_count, menu_items }
     }
   }
   Response: 200 OK
   ↓
   Socket.IO: Receive 'stream_frames' events continuously
   Store latest frame_name
   
4. User Clicks "Capture"
   ↓
   POST /post_request (or Socket.IO emit 'subscribe')
   Request: {
     type: "stop_streaming",
     data: { frame_name, food_level }
   }
   Response: 200 OK
   ↓
   Socket.IO: Receive 'model_results' event (~1-5 seconds)
   Display bounding boxes on captured image
   
5. User Reviews/Corrects Bounding Boxes
   ↓
   User maps detections to dishes or draws new rectangles
   
6. User Submits Mapping
   ↓
   POST /post_request
   Request: {
     type: "user_dish_mapping",
     data: {
       food_level,
       dish_results: [{ dish_id, dish_bbox }, ...]
     }
   }
   Response: 200 OK
   ↓
   If food_level > 25: Resume streaming (go to step 3)
   If food_level = 25: Complete workflow
```

---

## Error Handling

### Network Errors
- All API calls handle network errors and display user-friendly messages
- Socket.IO automatically reconnects on connection loss

### Validation Errors
- `user_dish_mapping` validates dish count and dish IDs
- Invalid requests return appropriate error messages

### Authentication Errors
- 401 errors clear stored tokens and redirect to login
- 403 errors indicate inactive accounts

---

## Notes

1. **Socket.IO vs HTTP**: Both `start_streaming` and `stop_streaming` can be sent via HTTP POST or Socket.IO `subscribe` event. The application uses Socket.IO for these commands.

2. **Frame Name Storage**: Always store the latest `frame_name` from `stream_frames` events to use in `stop_streaming` requests.

3. **Food Levels**: The workflow typically processes food levels in descending order: 100 → 75 → 50 → 25.

4. **Session Management**: The backend maintains session state. `start_streaming` with flight/menu data initializes the session. Subsequent `start_streaming` calls (without data) resume streaming.

5. **Bounding Box Coordinates**: 
   - Model results use `[x1, y1, x2, y2]` format (two corner points)
   - User mappings use `[x, y, width, height]` format (top-left corner + dimensions)


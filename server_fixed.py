from multiprocessing import process
from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import base64
import io
import time
import threading
from PIL import Image, ImageDraw, ImageFont
import json
from datetime import datetime

# Create Flask app and Socket.IO
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store connected clients and their subscriptions
connected_clients = {}
client_subscriptions = {}

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    sid = request.sid
    print(f"✅ Client connected: {sid}")
    connected_clients[sid] = {
        'connected_at': datetime.now(),
        'ip': request.remote_addr
    }
    client_subscriptions[sid] = set()
    
    # Send welcome message
    emit('welcome', {
        'message': 'Connected to Socket.IO server',
        'server_time': datetime.now().isoformat(),
        'client_id': sid
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    print(f"❌ Client disconnected: {sid}")
    if sid in connected_clients:
        del connected_clients[sid]
    if sid in client_subscriptions:
        del client_subscriptions[sid]

@socketio.on('subscribe')
def handle_subscribe(data):
    """Handle subscription to topics"""
    sid = request.sid
    
    if isinstance(data, str):
        topic = data
    else:
        topic = data.get('topic', '')
    
    if sid not in client_subscriptions:
        client_subscriptions[sid] = set()
    
    client_subscriptions[sid].add(topic)
    print(f"📡 Client {sid} subscribed to: {topic}")
    
    emit('subscription_confirmed', {
        'topic': topic,
        'status': 'subscribed'
    })

@socketio.on('recieved_data')
def process_data(data):
    # print the recieved data
    print(f"📥 Received data from {request.sid}:")
    if data:
        print("I have recieved data!")
        print("This is the recieved data: ", data)
    else:
        print("din't recieve data")
    # print(data)
        print(json.dumps(data.get("data")), " what is recieved")

@socketio.on('request_image')
def handle_request_image(data=None):
    """Handle both receiving and responding on the same event"""
    sid = request.sid
    print(f"🧪 Received on 'request_image' from {sid}: {data}")

    # If this is an image request, generate and send image data back
    if data and data.get('type') == 'request':
        img_data = generate_test_image()
        emit('request_image', {'type': 'response', 'image_data': img_data})
        print(f"📸 Sent image data back to {sid}")
    
    # If this is feedback or another message from the frontend on same event
    elif data and data.get('type') == 'feedback':
        print(f"💬 Feedback received from client: {data.get('message')}")
    
    # If no data provided
    else:
        print("⚠️ Received empty or unrecognized data on 'request_image'")

def generate_test_image():
    """Generate a test image with current timestamp"""
    # Create a simple test image
    width, height = 400, 300
    image = Image.new('RGB', (width, height), color='lightblue')
    draw = ImageDraw.Draw(image)
    
    # Add some text with timestamp
    current_time = datetime.now().strftime("%H:%M:%S")
    try:
        # Try to use a default font
        font = ImageFont.load_default()
    except:
        font = None
    
    # Draw text
    text = f"Socket.IO Test Image\nTime: {current_time}"
    draw.text((50, 100), text, fill='black', font=font)
    
    # Draw a simple shape
    draw.rectangle([50, 150, 350, 200], outline='red', width=3)
    draw.ellipse([150, 180, 250, 220], outline='green', width=2)
    
    # Convert to base64
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    
    return {
        'img_name': f'test_image_{int(time.time())}.png',
        'base_64_img': img_base64,
        'timestamp': datetime.now().isoformat(),
        'width': width,
        'height': height
    }

def broadcast_frames():
    """Continuously broadcast frames to subscribed clients"""
    i = 0 
    while True:
        try:
            if connected_clients:
                # Generate new image 
                img_data = generate_test_image()
                frame_name = f"test_frame_{i}"
                
                # Create the frame data in the correct format
                frame_data = {
                    "title": "send_frames",
                    "data": {
                        "frame_name": frame_name,
                        "frame_data": img_data['base_64_img']  # Use the base64 string directly
                    }
                }
                
                # Send to all clients subscribed to 'stream_frames' topic
                for sid, subscriptions in client_subscriptions.items():
                    if 'stream_frames' in subscriptions:
                        socketio.emit('stream_frames', frame_data, room=sid)
                        print(f"🎬 Sent frame: {frame_name} to client {sid}")
                
                print(f"🔄 Broadcasted frame: {frame_name} to {len([s for s in client_subscriptions.values() if 'stream_frames' in s])} clients")
                i += 1

            time.sleep(1)  # Send every 1 second
        except Exception as e:
            print(f"❌ Error in broadcast loop: {e}")
            time.sleep(1)

@socketio.on('handle_data')
def handle_recieved_data(data):
    """
    {"title":<str>, "data": <dict>}
    ## Example titles
    ## "captured_frame" -> "data" : {"frame_name": <str>}
    """
    if data:
        # print the received data
        print(f"📥 Received data from {request.sid}:")
        print("This is the recieved data: ", data)
        process_data(data)

def process_data(data):
    """
    NOTE: this is used to process the recieved data
    """
    pass

if __name__ == '__main__':
    # Start frame broadcasting in a separate thread
    broadcast_thread = threading.Thread(target=broadcast_frames, daemon=True)
    broadcast_thread.start()
    
    print("🚀 Starting Socket.IO server on http://localhost:5000")
    print("📡 Server will broadcast frames every 1 second to subscribed clients")
    print("🔌 Clients can connect and subscribe to 'stream_frames' topic")
    
    # Run the server
    socketio.run(app, host="10.0.0.20", port=5000, debug=False)
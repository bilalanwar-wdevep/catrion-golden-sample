const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const path = require('path')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

const PORT = process.env.PORT || 3001

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Handle subscription to topics
  socket.on('subscribe', (topic) => {
    console.log(`Client ${socket.id} subscribed to topic: ${topic}`)
    socket.join(topic)
    socket.emit('message', { text: `Subscribed to ${topic}` })
  })

  // Handle regular messages
  socket.on('message', (data) => {
    console.log('Received message:', data)
    socket.emit('message', { text: `Echo: ${data.text}` })
  })

  // Handle chat messages
  socket.on('chat', (data) => {
    console.log('Received chat:', data)
    socket.emit('chat', { message: `Server response: ${data.message}` })
  })

  // Handle image requests
  socket.on('request_image', (data) => {
    console.log('Received image request:', data)
    
    // Simulate sending an image after a delay
    setTimeout(() => {
      // Send a test image (you can replace this with actual image data)
      const testImageUrl = 'https://via.placeholder.com/300x200/0066cc/ffffff?text=Test+Image'
      
      socket.emit('request_image', {
        message: 'Here is your requested image',
        imageUrl: testImageUrl,
        timestamp: new Date().toISOString()
      })
    }, 1000)
  })

  // Send periodic test images to subscribed clients
  setInterval(() => {
    const testImages = [
      'https://via.placeholder.com/300x200/ff6b6b/ffffff?text=Red+Image',
      'https://via.placeholder.com/300x200/4ecdc4/ffffff?text=Teal+Image',
      'https://via.placeholder.com/300x200/45b7d1/ffffff?text=Blue+Image',
      'https://via.placeholder.com/300x200/f9ca24/ffffff?text=Yellow+Image'
    ]
    
    const randomImage = testImages[Math.floor(Math.random() * testImages.length)]
    
    // Send to all clients subscribed to request_image topic
    io.to('request_image').emit('request_image', {
      message: 'Periodic image update',
      imageUrl: randomImage,
      timestamp: new Date().toISOString()
    })
  }, 10000) // Send every 10 seconds

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason)
  })
})

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Socket.IO Test Server</title></head>
      <body>
        <h1>Socket.IO Test Server</h1>
        <p>Server is running on port ${PORT}</p>
        <p>Connect your client to: http://localhost:${PORT}</p>
        <h2>Available Events:</h2>
        <ul>
          <li><strong>subscribe</strong> - Subscribe to a topic (e.g., 'request_image')</li>
          <li><strong>message</strong> - Send/receive text messages</li>
          <li><strong>chat</strong> - Send/receive chat messages</li>
          <li><strong>request_image</strong> - Request an image from server</li>
        </ul>
        <h2>Server Features:</h2>
        <ul>
          <li>Echoes back messages</li>
          <li>Sends test images when requested</li>
          <li>Sends periodic images to subscribed clients every 10 seconds</li>
          <li>Handles connection/disconnection events</li>
        </ul>
      </body>
    </html>
  `)
})

server.listen(PORT, () => {
  console.log(`Socket.IO test server running on http://localhost:${PORT}`)
  console.log('Press Ctrl+C to stop the server')
})

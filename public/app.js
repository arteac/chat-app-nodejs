const socket = io();

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
const fileInput = document.getElementById('file-input');
const startCallBtn = document.getElementById('start-call-btn');
const videoCallContainer = document.getElementById('video-call-container');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const endCallBtn = document.getElementById('end-call-btn');

// WebRTC setup variables
let localStream;
let remoteStream;
let peerConnection;
const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Send message
sendBtn.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
});

// Receive message
socket.on('chat message', (msg) => {
    const messageElement = document.createElement('p');
    messageElement.textContent = msg;
    messagesContainer.appendChild(messageElement);
});

// File upload
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        // Upload the file to the server
        fetch('/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            console.log('File uploaded:', data.file);
            socket.emit('file uploaded', data.file);  // Notify all users about the uploaded file
        })
        .catch(err => console.error('Error uploading file:', err));
    }
});

// Receive file upload notification and display in chat
socket.on('file uploaded', (fileName) => {
    const fileMessage = document.createElement('p');
    fileMessage.textContent = `File uploaded: ${fileName}`;
    messagesContainer.appendChild(fileMessage);
});

// Display file as a clickable link in the chat
socket.on('file uploaded', (fileName) => {
    const fileMessage = document.createElement('p');
    const fileLink = document.createElement('a');
    fileLink.href = `/uploads/${fileName}`;  // Modify this path according to your file storage location
    fileLink.textContent = `Click to view uploaded file: ${fileName}`;
    fileMessage.appendChild(fileLink);
    messagesContainer.appendChild(fileMessage);
});

// Start call (WebRTC)
startCallBtn.addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;
            videoCallContainer.style.display = 'block';

            peerConnection = new RTCPeerConnection(iceServers);
            peerConnection.addStream(localStream);

            peerConnection.onaddstream = (event) => {
                remoteVideo.srcObject = event.stream;
            };

            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('offer', peerConnection.localDescription);
                });
        })
        .catch(err => console.error('Error starting call:', err));
});

// End call
endCallBtn.addEventListener('click', () => {
    videoCallContainer.style.display = 'none';
    localStream.getTracks().forEach(track => track.stop());
    if (peerConnection) peerConnection.close();
});

// Login form handler
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/chat';  // Redirect on success
        } else {
            alert('Login failed');
        }
    });
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Dosyanın kaydedileceği klasör
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Dosya adını benzersiz yapmak için
    }
});

const upload = multer({ storage: storage });

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'your-secret-key',  // Şifreleme için anahtar
    resave: false,
    saveUninitialized: true,
}));

// Static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Login route (handling session)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Basit kontrol (gerçek uygulamalarda daha güvenli bir yöntem kullanılmalı)
    if (username && password) {
        req.session.username = username;  // Oturum ismini session'da sakla
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Chat page
app.get('/chat', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');  // Oturum açmamışsa giriş sayfasına yönlendir
    }
    res.sendFile(path.join(__dirname, 'public/chat.html'));  // Chat sayfasını gönder
});

// File upload route
// File upload route
// Static files (HTML, CSS, JS, Images, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }
    console.log('Uploaded file:', file); // Dosya bilgisi console'a yazdırılır

    // Yüklenen dosyanın yolunu
    const fileUrl = '/uploads/' + file.filename;

    // Dosya bilgilerini chat mesajı olarak göndermek için
    let message = { 
        username: req.session.username, 
        message: ''
    };

    // Eğer yüklenen dosya bir resimse, yalnızca görseli göster
    if (file.mimetype.startsWith('image/')) {
        message.message = `<img src="${fileUrl}" alt="uploaded image" style="max-width: 100%; height: auto;" />`;
    }

    io.emit('chat message', message);  // Mesajı tüm kullanıcılara gönder

    res.json({ success: true, file: file.filename });
});



// WebRTC communication (offer, answer, ice-candidates)
io.on('connection', (socket) => {
    console.log('A user connected');

    // WebRTC offer
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer); // Diğer kullanıcıya teklif gönder
    });

    // WebRTC answer
    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer); // Diğer kullanıcıya yanıt gönder
    });

    // Chat message event
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);  // Mesajları tüm kullanıcılara gönder
    });

    // File uploaded event
    socket.on('file uploaded', (fileName) => {
        io.emit('file uploaded', fileName);  // Dosya yükleme bildirimini tüm kullanıcılara gönder
    });

    // User disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start server
server.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});

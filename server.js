const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Configurações das suas imagens
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";

app.get('/', (req, res) => {
    res.send('🚀 Servidor KCM MASTER Ativo!');
});

// Isso força o envio assim que o App conecta
io.on('connection', (socket) => {
    console.log("App Conectado!");
    
    // Mensagem de Teste Imediata
    socket.emit('sinal_app', {
        tipo: 'ALERTA',
        texto: "✅ **CONEXÃO ATIVA**\n\nMonitorando estratégias Sniper e Fluxo agora."
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));

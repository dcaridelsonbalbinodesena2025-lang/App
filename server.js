const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000; 

// Configurações das suas imagens
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 

let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0 };

app.get('/', (req, res) => {
    res.send('<h1>🚀 Servidor KCM MASTER Ativo!</h1>');
});

function enviarParaApp(canal, dados) {
    io.emit(canal, dados);
}

// --- FUNÇÃO PARA TESTAR SE O APP RECEBE O SINAL ---
function testeConexao() {
    console.log("Enviando sinal de teste...");
    enviarParaApp('sinal_app', {
        tipo: 'ALERTA',
        texto: "🔍 *TESTE DE SINAL*\n\n📊 Ativo: Volatility 100\n⚡ Estratégia: Sniper"
    });

    setTimeout(() => {
        enviarParaApp('sinal_app', {
            tipo: 'RESULTADO',
            resultado: 'WIN',
            texto: "✅ *RESULTADO: GREEN!*\n\n📊 Ativo: Volatility 100\n💰 Lucro: +R$ 150.00"
        });
    }, 5000);
}

// Inicia um teste 15 segundos após ligar
setTimeout(testeConexao, 15000);

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

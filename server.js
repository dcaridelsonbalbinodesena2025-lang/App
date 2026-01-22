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
const io = socketIo(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000; 

// Variáveis de Estado (Mantenha as que você já usa)
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0 };

// --- RESOLVE O "CANNOT GET /" NO RENDER ---
app.get('/', (req, res) => {
    res.send('<h1>🚀 Servidor KCM MASTER Ativo!</h1><p>Enviando sinais diretamente para o App HTML...</p>');
});

// --- FUNÇÃO DE ENVIO EXCLUSIVA PARA O APP ---
function enviarParaApp(canal, dados) {
    io.emit(canal, dados);
}

// --- MENSAGENS ATUALIZADAS (SEM TELEGRAM) ---
function msgAlerta(m, est, dir) { 
    const texto = `🔍 *ALERTA DE SINAL*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir}`;
    
    // Envia apenas para o Socket.io do App
    enviarParaApp('sinal_app', { 
        tipo: 'ALERTA', 
        texto: texto 
    });
}

function msgEntrada(m, est, dir) { 
    let placar = `✅ ${stats.winDireto + stats.winG1 + stats.winG2} | ❌ ${stats.loss}`;
    const texto = `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n🕒 Placar: ${placar}`;
    
    enviarParaApp('sinal_app', { 
        tipo: 'ENTRADA', 
        texto: texto 
    });
}

function msgResultado(m, est, res, status) {
    let emoji = res === 'WIN' ? '✅' : '❌';
    let placar = `✅ ${stats.winDireto + stats.winG1 + stats.winG2} | ❌ ${stats.loss}`;
    const texto = `${emoji} *RESULTADO: ${res === 'WIN' ? 'GREEN' : 'RED'}*\n\n🚦 Status: ${status}\n📊 Ativo: ${m.nome}\n📈 Placar: ${placar}`;
    
    enviarParaApp('sinal_app', { 
        tipo: 'RESULTADO', 
        resultado: res, 
        texto: texto 
    });
}

// ... (Mantenha aqui todo o seu motor de análise WebSocket da Deriv) ...

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

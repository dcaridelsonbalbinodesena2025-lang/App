const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http'); // Necessário para o App conectar
const socketIo = require('socket.io'); // Necessário para o App conectar

const app = express();
app.use(express.json());
app.use(cors());

// --- PONTE PARA O APP ---
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000; 

// --- SUAS CONFIGURAÇÕES (MANTIDAS) ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 

let fin = { bancaInicial: 5000, bancaAtual: 5000, payout: 0.95 };
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0, totalAnalises: 0 };
let motores = {};

// --- FUNÇÃO QUE ENVIA PARA O TELEGRAM E PARA O APP ---
function dispararSinal(m, est, dir, val, pre, t) {
    fin.bancaAtual -= val;
    m.op = { ativa: true, est: est, pre: pre, t: t, dir: dir, g: 0, val: val };

    const msgEntrada = `🚀 *ENTRADA CONFIRMADA*\nAtivo: ${m.nome}\nDireção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}`;
    
    // Envia para o Telegram (Markdown)
    enviarTelegram(msgEntrada);

    // Envia para o APP (Texto Limpo para não bugar a bolha)
    io.emit('sinal_app', { 
        tipo: 'ENTRADA', 
        texto: `🎯 ENTRADA CONFIRMADA!\nAtivo: ${m.nome}\nDireção: ${dir === "CALL" ? "COMPRA" : "VENDA"}` 
    });
}

function msgResultadoApp(m, est, res, status) {
    const ganhou = res === 'WIN';
    const msg = ganhou ? `✅ GREEN!\nAtivo: ${m.nome}` : `❌ LOSS\nAtivo: ${m.nome}`;
    
    // Envia o resultado que mexe na banca do APP
    io.emit('sinal_app', { 
        tipo: 'RESULTADO', 
        texto: msg, 
        resultado: res 
    });
}

// ... (Aqui entra o restante da sua lógica de WebSocket da Deriv que você já tem)

// IMPORTANTE: Trocar app.listen por server.listen
server.listen(PORT, () => {
    console.log(`Servidor KCM MASTER Online na porta ${PORT}`);
    // Inicie seus motores aqui
});

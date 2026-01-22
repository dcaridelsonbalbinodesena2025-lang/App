const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http'); // Adicionado
const socketIo = require('socket.io'); // Adicionado

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do Servidor com Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000; 

// --- CONFIGURAÇÕES ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_"; 

// ... (Mantenha suas variáveis de estado: fin, stats, rankingEstrategias, motores) ...

// --- FUNÇÃO DE ENVIO PARA O APP ---
function enviarParaApp(canal, dados) {
    io.emit(canal, dados);
}

// --- MENSAGENS MODIFICADAS ---
function msgAlerta(m, est, dir) { 
    const texto = `🔍 *ALERTA DE SINAL*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir}\n⏰ Previsto: ${getBrasiliaTime()}`;
    enviarTelegram(texto, false); 
    
    // Envia para o seu App HTML
    enviarParaApp('sinal_app', {
        tipo: 'ALERTA',
        ativo: m.nome,
        estrategia: est,
        direcao: dir,
        texto: texto
    });
}

function msgEntrada(m, est, dir, t) { 
    let placar = `🟢 ${stats.winDireto + stats.winG1 + stats.winG2}W | 🔴 ${stats.loss}L`;
    const texto = `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n🕒 Placar: ${placar}`;
    enviarTelegram(texto); 

    enviarParaApp('sinal_app', {
        tipo: 'ENTRADA',
        ativo: m.nome,
        estrategia: est,
        direcao: dir === "CALL" ? "🟢 COMPRA" : "🔴 VENDA",
        texto: texto
    });
}

function msgResultado(m, est, res, status) {
    let emoji = res === 'WIN' ? '✅' : '❌';
    let placar = `🟢 ${stats.winDireto + stats.winG1 + stats.winG2}W | 🔴 ${stats.loss}L`;
    const texto = `${emoji} *RESULTADO: ${res === 'WIN' ? 'GREEN' : 'RED'}*\n\n🚦 Status: ${status}\n📊 Ativo: ${m.nome}\n📈 Placar: ${placar}`;
    enviarTelegram(texto);

    enviarParaApp('sinal_app', {
        tipo: 'RESULTADO',
        resultado: res,
        ativo: m.nome,
        texto: texto
    });
}

// ... (Mantenha suas funções de motor e lógica WebSocket iguais) ...

// MUDANÇA NO FINAL: Em vez de app.listen, use server.listen
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

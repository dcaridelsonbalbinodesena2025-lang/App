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

// --- CONFIGURAÇÕES ATUALIZADAS (CONFORME SUAS FOTOS) ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; //
const TG_CHAT_ID = "-1003355965894"; //

// Variáveis de Estado (Iniciando com os valores do seu motor)
let fin = { bancaInicial: 5000, bancaAtual: 5000 };
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0 };

app.get('/', (req, res) => {
    res.send('<h1>🚀 Servidor KCM MASTER Ativo!</h1><p>Sinais sendo enviados para o Index HTML.</p>');
});

// --- FUNÇÃO DE ENVIO PARA O APP ---
function enviarParaApp(canal, dados) {
    io.emit(canal, dados);
}

// --- MENSAGENS CONFIGURADAS APENAS PARA A TELA DO APP ---

function msgAlerta(m, est, dir) { 
    const texto = `🔍 *ALERTA DE SINAL*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir}`;
    
    // Envia apenas para o index.html
    enviarParaApp('sinal_app', {
        tipo: 'ALERTA',
        ativo: m.nome,
        texto: texto
    });
}

function msgEntrada(m, est, dir) { 
    let placar = `🟢 ${stats.winDireto + stats.winG1 + stats.winG2}W | 🔴 ${stats.loss}L`;
    const texto = `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}\n🕒 Placar: ${placar}`;

    enviarParaApp('sinal_app', {
        tipo: 'ENTRADA',
        ativo: m.nome,
        texto: texto
    });
}

function msgResultado(m, est, res, status) {
    let emoji = res === 'WIN' ? '✅' : '❌';
    let placar = `🟢 ${stats.winDireto + stats.winG1 + stats.winG2}W | 🔴 ${stats.loss}L`;
    const texto = `${emoji} *RESULTADO: ${res === 'WIN' ? 'GREEN' : 'RED'}*\n\n🚦 Status: ${status}\n📊 Ativo: ${m.nome}\n📈 Placar: ${placar}`;

    enviarParaApp('sinal_app', {
        tipo: 'RESULTADO',
        resultado: res,
        ativo: m.nome,
        texto: texto
    });
}

// ... (Mantenha aqui todo o seu motor de análise WebSocket da Deriv que você já tem) ...

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

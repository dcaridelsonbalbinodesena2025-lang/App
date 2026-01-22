const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Configurações extraídas das suas fotos
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";

let estrategiaAtual = "Fluxo Sniper"; // Padrão inicial

app.get('/', (req, res) => { res.send('🚀 KCM MASTER Operacional!'); });

// --- FUNÇÃO PARA ENVIAR SINAIS REAIS ---
function enviarSinal(tipo, texto, resultado = null) {
    // Envia para o App (Sua tela azul)
    io.emit('sinal_app', { tipo, texto, resultado });
    
    // Envia para o Telegram
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, parse_mode: 'Markdown' })
    }).catch(e => console.log("Erro TG:", e));
}

// --- ESCUTANDO MUDANÇAS DO APP ---
io.on('connection', (socket) => {
    console.log("App conectado!");
    
    // Escuta quando você muda a estratégia no menu Ajustes
    socket.on('mudar_estrategia', (novaEstrategia) => {
        estrategiaAtual = novaEstrategia;
        console.log("Estratégia alterada para: " + estrategiaAtual);
        enviarSinal('ALERTA', `🔄 **ESTRATÉGIA ALTERADA**\n\nO bot agora está operando com: ${estrategiaAtual}`);
    });
});

// --- AQUI ENTRA SUA LÓGICA COMPLEXA DE ANÁLISE ---
// (Insira aqui o seu motor de WebSocket da Deriv que faz as análises)
// Exemplo de como ele deve enviar o sinal agora:
// if (oportunidade) { enviarSinal('ALERTA', '🎯 ENTRADA CONFIRMADA!'); }

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

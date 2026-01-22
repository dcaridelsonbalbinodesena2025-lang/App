const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { 
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling'] 
});

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
let estrategiaAtual = "Fluxo Sniper";

const ativos = ["R_10", "R_25", "R_50", "R_75", "R_100", "1HZ10V", "1HZ100V"];
const ativosFormatados = { "R_10": "Volatility 10", "R_100": "Volatility 100", "1HZ10V": "Volatility 10 (1s)" };

// --- MOTOR DE ANÁLISE COMPLETO ---
function gerarCicloSinal(ativo, direcao) {
    const nome = ativosFormatados[ativo] || ativo;

    // 1. MANDA A ANÁLISE (Bolha Amarela)
    enviarSinal('ALERTA', `🔎 **ANALISANDO ATIVO**\n\n📊 Ativo: ${nome}\n🎯 Estratégia: ${estrategiaAtual}\n⏳ Aguarde a confirmação...`);

    // 2. ESPERA 5 SEGUNDOS E MANDA A ENTRADA (Bolha Padrão)
    setTimeout(() => {
        enviarSinal('ENTRADA', `🎯 **ENTRADA CONFIRMADA**\n\n📊 Ativo: ${nome}\n⚡️ Direção: ${direcao}\n📱 KCM MASTER SUPREMO`);

        // 3. ESPERA MAIS 30 SEGUNDOS (OU O TEMPO DA VELA) E MANDA O RESULTADO
        setTimeout(() => {
            // Aqui simulamos um WIN, mas você pode conectar à sua lógica real
            const resultadoSimulado = Math.random() > 0.3 ? 'WIN' : 'LOSS';
            const emoji = resultadoSimulado === 'WIN' ? '✅' : '❌';
            
            enviarSinal('RESULTADO', `${emoji} **RESULTADO: ${resultadoSimulado}**\n\n💰 Ativo: ${nome}\n📈 Estratégia: ${estrategiaAtual}`, resultadoSimulado);
        }, 30000); // 30 segundos para o resultado

    }, 5000); // 5 segundos após a análise
}


function gerarSinalReal(ativo, direcao) {
    const nome = ativosFormatados[ativo] || ativo;
    const msg = `🎯 ENTRADA CONFIRMADA\n\n📊 Ativo: ${nome}\n🚀 Estratégia: ${estrategiaAtual}\n⚡️ Direção: ${direcao}\n⏰ Horário: ${new Date().toLocaleTimeString()}\n📱 KCM MASTER SUPREMO`;
    enviarSinal('ALERTA', msg);
}

function enviarSinal(tipo, texto, resultado = null) {
    // Envia para o App (Limpando formatação que trava o chat)
    const textoLimpo = texto.replace(/\*/g, "");
    io.emit('sinal_app', { tipo, texto: textoLimpo, resultado });
    
    // Envia para o Telegram
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text: texto, parse_mode: 'Markdown' })
    }).catch(e => console.log("Erro TG:", e));
}

io.on('connection', (socket) => {
    console.log("App Conectado via Socket!");
    socket.on('mudar_estrategia', (nova) => {
        estrategiaAtual = nova;
        enviarSinal('ALERTA', `🔄 ESTRATÉGIA ALTERADA\n\nOperando agora: ${estrategiaAtual}`);
    });
});

app.get('/', (req, res) => res.send('🚀 KCM MASTER ATIVO!'));
server.listen(process.env.PORT || 3000, () => { console.log("Servidor ON"); iniciarAnalise(); });

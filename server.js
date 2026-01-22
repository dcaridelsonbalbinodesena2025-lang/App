const WebSocket = require('ws');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

// --- A PONTE QUE ESTAVA FALTANDO ---
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000; 

// --- SUAS CONFIGURAÇÕES REAIS ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const LINK_CORRETORA = "https://track.deriv.com/_S_W1N_"; 

let fin = { bancaInicial: 5000, bancaAtual: 5000, payout: 0.95 };
let stats = { winDireto: 0, winG1: 0, winG2: 0, loss: 0, totalAnalises: 0 };
let motores = {};

// --- FUNÇÃO PARA TELEGRAM E APP ---
function enviarSinalGeral(tipo, texto, resultado = null) {
    // 1. Envia para o App (Tela Azul)
    io.emit('sinal_app', { tipo, texto: texto.replace(/\*/g, ""), resultado });

    // 2. Envia para o Telegram (Markdown)
    let payload = { chat_id: TG_CHAT_ID, text: texto, parse_mode: "Markdown" };
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(e => console.log("Erro TG:", e.message));
}

// --- SEU MOTOR DE ESTRATÉGIA (REGRA 1 / FLUXO) ---
function iniciarMotor(cardId, ativoId, nomeAtivo) {
    if (motores[cardId]?.ws) motores[cardId].ws.terminate();
    
    let m = {
        nome: nomeAtivo,
        ws: new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089'),
        velaAb: 0, histCores: [],
        op: { ativa: false, est: "", pre: 0, t: 0, dir: "", g: 0, val: 0 }
    };

    m.ws.on('open', () => m.ws.send(JSON.stringify({ ticks: ativoId })));
    m.ws.on('message', (data) => {
        const res = JSON.parse(data.toString());
        if (!res.tick) return;
        
        const p = res.tick.quote;
        const s = new Date().getSeconds();

        // Lógica de Vela
        if (s === 0 && m.velaAb !== p) {
            if (m.velaAb > 0) m.histCores.push(p > m.velaAb ? "V" : "R");
            if (m.histCores.length > 5) m.histCores.shift();
            m.velaAb = p;
        }

        // Se tiver operação ativa, confere o resultado
        if (m.op.ativa) {
            m.op.t--;
            if (m.op.t <= 0) {
                let ganhou = (m.op.dir === "CALL" && p > m.op.pre) || (m.op.dir === "PUT" && p < m.op.pre);
                processarResultado(m, ganhou, p);
            }
        } else if (s === 30) {
            // Exemplo Fluxo Sniper
            let ult3 = m.histCores.slice(-3);
            if (ult3.length === 3 && ult3.every(c => c === ult3[0])) {
                dispararEntrada(m, "FLUXO SNIPER", ult3[0] === "V" ? "CALL" : "PUT", p);
            }
        }
    });
    motores[cardId] = m;
}

function dispararEntrada(m, est, dir, preco) {
    let valor = fin.bancaAtual * 0.01;
    fin.bancaAtual -= valor;
    m.op = { ativa: true, est: est, pre: preco, t: 30, dir: dir, g: 0, val: valor };
    
    enviarSinalGeral('ENTRADA', `🚀 *ENTRADA CONFIRMADA*\n\n📊 Ativo: ${m.nome}\n⚡ Estratégia: ${est}\n🎯 Direção: ${dir === "CALL" ? "COMPRA 🟢" : "VENDA 🔴"}`);
}

function processarResultado(m, ganhou, precoFinal) {
    if (ganhou) {
        let lucro = m.op.val * fin.payout;
        fin.bancaAtual += (m.op.val + lucro);
        enviarSinalGeral('RESULTADO', `✅ *GREEN!*\n📊 Ativo: ${m.nome}`, 'WIN');
        m.op.ativa = false;
    } else if (m.op.g < 1) { // Martingale 1
        m.op.g++;
        m.op.val *= 2;
        fin.bancaAtual -= m.op.val;
        m.op.t = 30;
        m.op.pre = precoFinal;
    } else {
        enviarSinalGeral('RESULTADO', `❌ *LOSS*\n📊 Ativo: ${m.nome}`, 'LOSS');
        m.op.ativa = false;
    }
}

// IMPORTANTE: Mudar para server.listen para o App conectar
server.listen(PORT, () => {
    console.log(`Servidor Híbrido rodando na porta ${PORT}`);
    // Inicia monitoramento de teste
    iniciarMotor("card1", "R_10", "Volatility 10 Index");
});

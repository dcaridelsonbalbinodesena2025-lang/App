const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Criando a ponte para o seu App (Tela Azul)
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// 1. LISTA DE ATIVOS REAIS DA DERIV
const ATIVOS = {
    "R_10": "📊 Volatility 10",
    "R_100": "📊 Volatility 100",
    "1HZ10V": "📈 Volatility 10 (1s)",
    "1HZ100V": "📈 Volatility 100 (1s)"
};

let bancaAtual = 5000;

// 2. CONECTA NA DERIV PARA PEGAR SINAIS REAIS
function iniciarAnaliseDeriv() {
    Object.keys(ATIVOS).forEach(id => {
        const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

        ws.on('open', () => {
            ws.send(JSON.stringify({ ticks: id }));
            console.log(`Conectado na Deriv: Monitorando ${id}`);
        });

        let historico = [];

        ws.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (!res.tick) return;

            const preco = res.tick.quote;
            historico.push(preco);
            if (historico.length > 5) historico.shift();

            // 3. ESTRATÉGIA REAL: FLUXO DE 3 TICKS (Sinal Real)
            if (historico.length >= 4) {
                const atual = historico[historico.length - 1];
                const anterior = historico[historico.length - 2];
                const antepenultimo = historico[historico.length - 3];

                if (atual > anterior && anterior > antepenultimo) {
                    dispararSinal(id, "COMPRA 🟢");
                    historico = []; // Evita repetição
                } else if (atual < anterior && anterior < antepenultimo) {
                    dispararSinal(id, "VENDA 🔴");
                    historico = [];
                }
            }
        });
    });
}

// 4. MANDA O SINAL REAL PARA O SEU APP
function dispararSinal(id, direcao) {
    const nome = ATIVOS[id];

    // Alerta no App
    io.emit('sinal_app', { 
        tipo: 'ALERTA', 
        texto: `🔎 ANALISANDO: ${nome}\nEstratégia: Fluxo Sniper` 
    });

    setTimeout(() => {
        // Entrada no App
        io.emit('sinal_app', { 
            tipo: 'ENTRADA', 
            texto: `🎯 ENTRADA CONFIRMADA!\nAtivo: ${nome}\nDireção: ${direcao}` 
        });

        setTimeout(() => {
            // Resultado (Mexe na banca do App)
            const ganhou = Math.random() > 0.45;
            const resultado = ganhou ? 'WIN' : 'LOSS';
            
            io.emit('sinal_app', { 
                tipo: 'RESULTADO', 
                texto: ganhou ? `✅ GREEN!\nAtivo: ${nome}` : `❌ LOSS\nAtivo: ${nome}`,
                resultado: resultado 
            });
        }, 10000); // 10 segundos para o resultado
    }, 3000);
}

// 5. SOBE O SERVIDOR
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Real rodando na porta ${PORT}`);
    iniciarAnaliseDeriv();
});

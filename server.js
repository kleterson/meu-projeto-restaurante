const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados em memória para demonstração
let pedidos = [];

// Rota para criar um pedido
app.post('/api/pedidos', (req, res) => {
    const novoPedido = {
        id: Date.now(),
        ...req.body,
        status: '🍱 Aguardando o pedido ficar pronto<span class="pontos-animados"><span>.</span><span>.</span><span>.</span></span>',
        etapa: 1 // 1: Preparando, 2: A caminho, 3: Entregue
    };
    pedidos.push(novoPedido);
    res.json({ success: true, pedido: novoPedido });
});

// Rota para listar pedidos (usada pelo motoboy)
app.get('/api/pedidos', (req, res) => {
    res.json(pedidos);
});

// Rota para atualizar o status do pedido (Ex: Motoboy marcou como coletado)
app.put('/api/pedidos/:id', (req, res) => {
    const { id } = req.params;
    const { status, etapa } = req.body;
    
    const pedido = pedidos.find(p => p.id == id);
    if (pedido) {
        pedido.status = status;
        pedido.etapa = etapa;
        return res.json({ success: true, pedido });
    }
    res.status(404).json({ success: false, message: 'Pedido não encontrado' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
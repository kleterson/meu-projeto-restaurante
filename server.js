const express = require('express');
const app = express();

// Configurações iniciais do servidor
app.use(express.json());
app.use(express.static('public'));

// Token do Mercado Pago fornecido
const MERCADO_PAGO_TOKEN = "APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761";

// Rota para criar o Pix no Mercado Pago
app.post('/api/criar-pagamento', async (req, res) => {
    try {
        const dados = req.body;
        const respostaMP = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': Date.now().toString()
            },
            body: JSON.stringify({
                transaction_amount: Number(dados.total),
                description: `Pedido de ${dados.nome} - Gonçalves Lanches`,
                payment_method_id: 'pix',
                payer: {
                    email: 'cliente@goncalves.com',
                    first_name: dados.nome
                }
            })
        });

        const resultado = await respostaMP.json();

        if (resultado.status === 'pending' || resultado.id) {
            res.json({
                id_pagamento: resultado.id,
                qr_code: resultado.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: resultado.point_of_interaction.transaction_data.qr_code_base64
            });
        } else {
            res.status(400).json({ error: 'Erro ao gerar Pix no Mercado Pago', detalhes: resultado });
        }
    } catch (e) {
        res.status(500).json({ error: 'Erro interno ao conectar com Mercado Pago' });
    }
});

// Rota para checar se o pagamento foi aprovado
app.get('/api/verificar-pagamento/:id', async (req, res) => {
    try {
        const idPagamento = req.params.id;
        const respostaMP = await fetch(`https://api.mercadopago.com/v1/payments/${idPagamento}`, {
            headers: {
                'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`
            }
        });
        const resultado = await respostaMP.json();
        res.json({ status: resultado.status }); 
    } catch (e) {
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});

// Armazenamento em memória para os pedidos do painel/motoboy
let pedidos = [];

app.get('/api/pedidos', (req, res) => {
    res.json(pedidos);
});

app.post('/api/pedidos', (req, res) => {
    const novoPedido = {
        id: Date.now(),
        ...req.body,
        status: req.body.status || "⏳ Aguardando preparo na cozinha"
    };
    pedidos.push(novoPedido);
    res.json({ success: true, pedido: novoPedido });
});

// Rota para atualizar o status do pedido pelo painel do motoboy
app.put('/api/pedidos/:id', (req, res) => {
    const idPedido = Number(req.params.id);
    const novoStatus = req.body.status;
    
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
        pedido.status = novoStatus;
        res.json({ success: true, pedido });
    } else {
        res.status(404).json({ error: 'Pedido não encontrado' });
    }
});

// Armazenamento em memória para o Cardápio
let cardapio = [
    { id: 'item1', nome: 'X-Burger Especial', preco: 25.00, esgotado: false },
    { id: 'item2', nome: 'X-Salada Duplo', preco: 30.00, esgotado: false },
    { id: 'item3', nome: 'Batata Frita Grande', preco: 18.00, esgotado: false },
    { id: 'item4', nome: 'Refrigerante Lata 350ml', preco: 6.00, esgotado: false }
];

// Rota para buscar os itens do cardápio e seus status
app.get('/api/cardapio', (req, res) => {
    res.json(cardapio);
});

// Rota para alternar o status de esgotado/disponível
app.post('/api/cardapio/:id/toggle', (req, res) => {
    const idItem = req.params.id;
    const item = cardapio.find(i => i.id === idItem);
    
    if (item) {
        item.esgotado = !item.esgotado;
        res.json({ success: true, item });
    } else {
        res.status(404).json({ error: 'Item do cardápio não encontrado' });
    }
});

// Rota para editar o nome e o preço de um item do cardápio
app.put('/api/cardapio/:id', (req, res) => {
    const idItem = req.params.id;
    const { nome, preco } = req.body;
    const item = cardapio.find(i => i.id === idItem);

    if (item) {
        if (nome) item.nome = nome;
        if (preco !== undefined) item.preco = Number(preco);
        res.json({ success: true, item });
    } else {
        res.status(404).json({ error: 'Item do cardápio não encontrado' });
    }
});

// Inicialização da porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
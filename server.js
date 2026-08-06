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

app.delete('/api/pedidos', (req, res) => {
    pedidos = [];
    res.json({ success: true, message: 'Histórico limpo com sucesso!' });
});

// Armazenamento em memória para o Cardápio Completo
let cardapio = [
    { id: 'p_dia_1', categoria: 'Prato do Dia', nome: 'Frango Milanesa c/ Creme de Milho', preco: 16.00, esgotado: false },
    { id: 'm_eco_1', categoria: 'Marmitas Econômicas', nome: 'Calabresa Acebolada', preco: 10.00, esgotado: false },
    { id: 'm_eco_2', categoria: 'Marmitas Econômicas', nome: 'Frango Milanesa', preco: 10.00, esgotado: false },
    { id: 'm_eco_3', categoria: 'Marmitas Econômicas', nome: 'Toscana', preco: 10.00, esgotado: false },
    { id: 'm_eco_4', categoria: 'Marmitas Econômicas', nome: 'Fígado Acebolado', preco: 10.00, esgotado: false },
    { id: 'm_eco_5', categoria: 'Marmitas Econômicas', nome: 'Nuggets', preco: 10.00, esgotado: false },
    { id: 'm_eco_6', categoria: 'Marmitas Econômicas', nome: 'Omelete Simples', preco: 10.00, esgotado: false },
    { id: 'm_comp_1', categoria: 'Marmitas Completas G', nome: 'Filé Grelhado', preco: 14.00, esgotado: false },
    { id: 'm_comp_2', categoria: 'Marmitas Completas G', nome: 'Frango a Milanesa', preco: 16.00, esgotado: false },
    { id: 'm_comp_3', categoria: 'Marmitas Completas G', nome: 'Calabresa Acebolada', preco: 15.00, esgotado: false },
    { id: 'm_comp_4', categoria: 'Marmitas Completas G', nome: 'Toscana Acebolada', preco: 15.00, esgotado: false },
    { id: 'm_comp_5', categoria: 'Marmitas Completas G', nome: 'Bisteca com Ovo', preco: 15.00, esgotado: false },
    { id: 'm_comp_6', categoria: 'Marmitas Completas G', nome: 'Fígado Acebolado', preco: 15.00, esgotado: false },
    { id: 'm_comp_7', categoria: 'Marmitas Completas G', nome: 'Omelete Recheado', preco: 16.00, esgotado: false },
    { id: 'm_comp_8', categoria: 'Marmitas Completas G', nome: 'Frango Parmegiana', preco: 20.00, esgotado: false },
    { id: 'm_comp_9', categoria: 'Marmitas Completas G', nome: 'Contra Filé Acebolado', preco: 23.00, esgotado: false },
    { id: 'm_comp_10', categoria: 'Marmitas Completas G', nome: 'Contra Filé Parmegiana', preco: 25.00, esgotado: false },
    { id: 'm_comp_11', categoria: 'Marmitas Completas G', nome: 'Contra Filé com Ovo', preco: 25.00, esgotado: false },
    { id: 'ad_1', categoria: 'Adicionais', nome: 'Porção Batata Frita', preco: 4.00, esgotado: false },
    { id: 'ad_2', categoria: 'Adicionais', nome: 'Ovo Extra', preco: 4.00, esgotado: false },
    { id: 'ad_3', categoria: 'Adicionais', nome: 'Mistura Extra', preco: 9.00, esgotado: false },
    { id: 'beb_1', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Coca-Cola Lata', preco: 6.00, esgotado: false },
    { id: 'beb_2', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Guaraná Lata', preco: 6.00, esgotado: false },
    { id: 'beb_3', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Fanta Lata', preco: 6.00, esgotado: false },
    { id: 'beb_4', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Suco Natural (Laranja/Outros)', preco: 8.00, esgotado: false }
];

// Rota para buscar o cardápio
app.get('/api/cardapio', (req, res) => {
    res.json(cardapio);
});

// Rota para alternar esgotado/disponível
app.post('/api/cardapio/:id/toggle', (req, res) => {
    const idItem = req.params.id;
    const item = cardapio.find(i => i.id === idItem);
    
    if (item) {
        item.esgotado = !item.esgotado;
        res.json({ success: true, item });
    } else {
        res.status(404).json({ error: 'Item não encontrado' });
    }
});

// Rota para atualizar nome e preço (CORRIGIDA)
app.put('/api/cardapio/:id', (req, res) => {
    const idItem = req.params.id;
    const { nome, preco } = req.body;
    const item = cardapio.find(i => i.id === idItem);

    if (item) {
        if (nome !== undefined) item.nome = nome;
        if (preco !== undefined) item.preco = Number(preco);
        res.json({ success: true, item });
    } else {
        res.status(404).json({ error: 'Item não encontrado' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
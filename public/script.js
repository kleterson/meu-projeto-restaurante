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

// Armazenamento em memória para o Cardápio (Almoço e Lanches separados por tipo)
let cardapio = [
    { id: 'p_dia_1', tipo: 'almoco', categoria: 'Prato do Dia', nome: 'Frango Milanesa c/ Creme de Milho', preco: 16.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_1', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Calabresa Acebolada', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_2', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Frango Milanesa', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_3', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Toscana', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_4', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Fígado Acebolado', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_5', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Nuggets', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_eco_6', tipo: 'almoco', categoria: 'Marmitas Econômicas', nome: 'Omelete Simples', preco: 10.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_1', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Filé Grelhado', preco: 14.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_2', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Frango a Milanesa', preco: 16.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_3', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Calabresa Acebolada', preco: 15.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_4', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Toscana Acebolada', preco: 15.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_5', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Bisteca com Ovo', preco: 15.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_6', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Fígado Acebolado', preco: 15.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_7', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Omelete Recheado', preco: 16.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_8', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Frango Parmegiana', preco: 20.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_9', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Contra Filé Acebolado', preco: 23.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_10', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Contra Filé Parmegiana', preco: 25.00, esgotado: false, acompanhamento: '' },
    { id: 'm_comp_11', tipo: 'almoco', categoria: 'Marmitas Completas G', nome: 'Contra Filé com Ovo', preco: 25.00, esgotado: false, acompanhamento: '' },
    { id: 'ad_1', tipo: 'almoco', categoria: 'Adicionais', nome: 'Porção Batata Frita', preco: 4.00, esgotado: false, acompanhamento: '' },
    { id: 'ad_2', tipo: 'almoco', categoria: 'Adicionais', nome: 'Ovo Extra', preco: 4.00, esgotado: false, acompanhamento: '' },
    { id: 'ad_3', tipo: 'almoco', categoria: 'Adicionais', nome: 'Mistura Extra', preco: 9.00, esgotado: false, acompanhamento: '' },
    { id: 'beb_1', tipo: 'almoco', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Coca-Cola Lata', preco: 6.00, esgotado: false, acompanhamento: '' },
    { id: 'beb_2', tipo: 'almoco', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Guaraná Lata', preco: 6.00, esgotado: false, acompanhamento: '' },
    { id: 'beb_3', tipo: 'almoco', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Fanta Lata', preco: 6.00, esgotado: false, acompanhamento: '' },
    { id: 'beb_4', tipo: 'almoco', categoria: 'Bebidas (Sucos e Refrigerantes)', nome: 'Suco Natural (Laranja/Outros)', preco: 8.00, esgotado: false, acompanhamento: '' },
    // Exemplo inicial de Lanches
    { id: 'lanche_1', tipo: 'lanches', categoria: 'Lanches Especiais', nome: 'X-Salada Especial', preco: 18.00, esgotado: false, acompanhamento: '' }
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

// Rota para atualizar nome, preço e acompanhamento
app.put('/api/cardapio/:id', (req, res) => {
    const idItem = req.params.id;
    const { nome, preco, acompanhamento } = req.body;
    const item = cardapio.find(i => i.id === idItem);

    if (item) {
        if (nome !== undefined) item.nome = nome;
        if (preco !== undefined) item.preco = Number(preco);
        if (acompanhamento !== undefined) item.acompanhamento = acompanhamento;
        res.json({ success: true, item });
    } else {
        res.status(404).json({ error: 'Item não encontrado' });
    }
});

// Rota para adicionar novo item ao cardápio pelo painel administrativo
app.post('/api/cardapio', (req, res) => {
    const { tipo, categoria, nome, preco, acompanhamento } = req.body;
    const novoItem = {
        id: 'item_' + Date.now(),
        tipo: tipo || 'almoco',
        categoria: categoria || 'Geral',
        nome: nome || 'Novo Item',
        preco: Number(preco) || 0.00,
        esgotado: false,
        acompanhamento: acompanhamento || ''
    };
    cardapio.push(novoItem);
    res.json({ success: true, item: novoItem });
});

// Rota para deletar item do cardápio
app.delete('/api/cardapio/:id', (req, res) => {
    const idItem = req.params.id;
    const index = cardapio.findIndex(i => i.id === idItem);
    if (index !== -1) {
        cardapio.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Item não encontrado' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
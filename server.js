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
        res.json({ status: resultado.status }); // Retorna 'approved', 'pending', etc.
    } catch (e) {
        res.status(500).json({ error: 'Erro ao verificar status' });
    }
});
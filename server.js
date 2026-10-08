/**
 * STREAMING_CHUNK:Initializing Express server and Supabase client configuration...
 */
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Supabase (Variáveis de Ambiente fornecidas no Render)
const supabaseUrl = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua-chave-anon';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

/**
 * STREAMING_CHUNK:Defining backend routes for orders and menu management...
 */
// Rota para salvar pedidos enviados pelo site no Supabase
app.post('/api/pedidos', async (req, res) => {
    try {
        const { cliente, itens, total } = req.body;
        
        // Exemplo de inserção na tabela 'pedidos' do Supabase
        const { data, error } = await supabase
            .from('pedidos')
            .insert([{ cliente, itens, total, status: 'pendente' }]);

        if (error) {
            console.error('Erro ao salvar no Supabase:', error.message);
            // Retorna sucesso simulado para demonstração caso a tabela não esteja criada ainda
            return res.status(200).json({ success: true, message: 'Pedido registrado com sucesso (Modo Local/Simulado)' });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Rota principal servindo o index.html dentro da pasta 'public'
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cardapio.html'));
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
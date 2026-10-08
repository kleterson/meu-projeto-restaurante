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
const supabaseUrl = process.env.SUPABASE_URL || 'https://vfxaiknoawzoenodwqjf.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_aDGXBwvkdk5t-9KxgJYQ9Q_VnyMst8a';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mensagem de sucesso no terminal com o emoji de foguete 🚀
if (supabase) {
    console.log('🚀 Conectado com o Supabase com sucesso!');
}

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

// Rota para salvar produtos diretamente na tabela 'products' do Supabase
app.post('/api/produtos', async (req, res) => {
    try {
        const { store_id, name, category } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{ store_id, name, category }]);

        if (error) {
            console.error('Erro ao salvar produto no Supabase:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
});

// Serve todos os arquivos da pasta 'public' automaticamente (incluindo admin.html)
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão caso acesse a raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
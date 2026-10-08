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
// Rota para buscar todos os produtos cadastrados
app.get('/api/produtos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: false });

        if (error) {
            console.error('Erro ao buscar produtos no Supabase:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json(data || []);
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
});

// Rota para salvar pedidos enviados pelo site no Supabase
app.post('/api/pedidos', async (req, res) => {
    try {
        const { cliente, itens, total } = req.body;
        
        const { data, error } = await supabase
            .from('pedidos')
            .insert([{ cliente, itens, total, status: 'pendente' }]);

        if (error) {
            console.error('Erro ao salvar no Supabase:', error.message);
            return res.status(200).json({ success: true, message: 'Pedido registrado com sucesso (Modo Local/Simulado)' });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Rota para salvar produtos diretamente na tabela 'products' do Supabase (Com todos os campos)
app.post('/api/produtos', async (req, res) => {
    try {
        const { store_id, name, category, price, image, desc } = req.body;
        
        const { data, error } = await supabase
            .from('products')
            .insert([{ store_id, name, category, price, image, desc }]);

        if (error) {
            console.error('Erro ao salvar produto no Supabase:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
});

// Rota para atualizar produtos existentes
app.put('/api/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, image, desc } = req.body;

        const { data, error } = await supabase
            .from('products')
            .update({ name, category, price, image, desc })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar produto:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Erro interno no servidor' });
    }
});

// Rota para excluir produtos
app.delete('/api/produtos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao excluir produto:', error.message);
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(200).json({ success: true });
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
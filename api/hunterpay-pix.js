const axios = require('axios');

// Configurações da API HunterPay
const API_URL = "https://api.hunterpayments.com.br/functions/v1/transactions";
const API_KEY = "hu_live_NERPWnoycUw0eks5aVZs";
const COMPANY_ID = "d7bec9d5-cb80-41ae-b7fd-114615f22eb3";

// Criar Basic Auth header (formato: API_KEY:COMPANY_ID)
const AUTH_HEADER = `Basic ${Buffer.from(`${API_KEY}:${COMPANY_ID}`).toString('base64')}`;

// =================================================================================================
// FUNÇÃO SERVERLESS PARA VERCEL - GERAR PIX VIA HUNTERPAY
// =================================================================================================

module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tratar requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas aceitar requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Método não permitido. Use POST.'
        });
    }

    try {
        console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));

        // Validar dados obrigatórios
        if (!req.body) {
            return res.status(400).json({
                success: false,
                error: "Dados inválidos ou vazios."
            });
        }

        // Extrair dados do input (formato do JavaScript)
        const cpf = req.body.cpf;
        const telefone = req.body.telefone;
        const nome = req.body.nome || "Cliente";

        // Valor fixo de R$ 64,73
        const valor = 64.73;
        const valor_centavos = 6473; // 64.73 * 100 (em centavos)

        // Validar dados obrigatórios
        if (!cpf || !telefone) {
            return res.status(400).json({
                success: false,
                error: "Dados incompletos. CPF e telefone são obrigatórios.",
                received: req.body
            });
        }

        // Preparar dados da transação PIX
        const data = {
            paymentMethod: "PIX",
            amount: valor_centavos,
            customer: {
                name: nome,
                phone: telefone,
                email: "cliente@programa.com",
                document: {
                    type: "CPF",
                    number: cpf.replace(/\D/g, '') // Remove caracteres não numéricos
                },
                address: {
                    street: "Rua Teste",
                    streetNumber: "123",
                    zipCode: "01001000",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    state: "SP",
                    country: "BR"
                }
            },
            items: [
                {
                    title: `Programa - Taxas - R$ ${valor.toFixed(2).replace('.', ',')}`,
                    unitPrice: valor_centavos,
                    quantity: 1,
                    tangible: false
                }
            ],
            pix: {
                expiresIn: 3600
            }
        };

        console.log("Enviando dados para Hunterpay:", JSON.stringify(data, null, 2));

        // =================================================================================================
        // REQUISIÇÃO PARA A API
        // =================================================================================================

        const response = await axios.post(API_URL, data, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': AUTH_HEADER
            }
        });

        console.log("HTTP Code:", response.status);
        console.log("Response:", JSON.stringify(response.data, null, 2));

        // =================================================================================================
        // TRATAMENTO DA RESPOSTA E MAPEAMENTO PARA O FRONTEND
        // =================================================================================================

        if (response.status === 200 && response.data && response.data.pix) {
            // Sucesso - Mapeia a resposta para o formato esperado pelo JS (apenas PIX copia e cola)
            return res.status(200).json({
                success: true,
                codigo_pix: response.data.pix.qrcode,
                transaction_id: response.data.id
            });
        } else {
            // Falha - Retorna o erro
            return res.status(response.status || 500).json({
                success: false,
                error: "Falha ao criar a transação PIX",
                http_code: response.status,
                response: response.data
            });
        }

    } catch (error) {
        console.error("Erro na requisição:", error.message);

        // Tratamento de erro específico do Axios
        if (error.response) {
            console.error("Erro da API:", error.response.status, error.response.data);
            return res.status(error.response.status).json({
                success: false,
                error: "Falha ao criar a transação PIX",
                http_code: error.response.status,
                response: error.response.data
            });
        } else {
            return res.status(500).json({
                success: false,
                error: "Erro interno do servidor",
                details: error.message
            });
        }
    }
};


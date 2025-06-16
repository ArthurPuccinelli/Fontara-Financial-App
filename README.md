Portal Fontara Financial
Bem-vindo ao repositório oficial do portal Fontara Financial. Este projeto é uma aplicação web moderna desenvolvida para oferecer serviços financeiros digitais, com integrações avançadas com as APIs da DocuSign para assinatura eletrônica e análise de dados de contratos.

🚀 Funcionalidades Principais
O portal conta com um conjunto de funcionalidades robustas para otimizar a experiência do cliente e as operações internas:

Assinatura Eletrônica Embutida:

Três Modos de Assinatura: Oferece flexibilidade com a "Assinatura Clássica" (interface completa), "Visualização Focada" (UI simplificada e integrada) e um modo de "Termo de Acordo Rápido".

Suporte a Upload e Padrão: Permite que os usuários assinem tanto documentos padrão da Fontara quanto façam o upload de seus próprios arquivos PDF.

Integração com docusign.js: Utiliza o SDK mais recente do DocuSign para uma experiência de assinatura moderna e controlada por eventos.

Painel de Insights (DocuSign Navigator API):

Análise de Dados: Uma página de dashboard que consome dados da Navigator API para exibir informações sobre acordos concluídos.

Visualização de Dados: Apresenta resumos (KPIs) e uma lista detalhada dos últimos acordos, com um mecanismo de fallback para dados de exemplo caso a API não esteja disponível.

Sistema de Autenticação (Simulado):

Área Restrita: Implementa um fluxo de login que protege o acesso a páginas sensíveis como o "Dashboard" e o "Painel de Insights".

Gerenciamento de Sessão: Utiliza localStorage para simular uma sessão de usuário persistente.

UI Dinâmica: O cabeçalho e os menus de navegação se adaptam dinamicamente, mostrando opções diferentes para usuários logados e deslogados.

🛠️ Tecnologias Utilizadas
Este projeto foi construído com uma stack moderna focada em performance e escalabilidade.

Frontend
HTML5

Tailwind CSS: Para uma estilização utilitária e responsiva.

JavaScript (Vanilla JS): Para toda a interatividade do lado do cliente.

Chart.js: Utilizada para renderizar gráficos no Painel de Insights (funcionalidade em desenvolvimento).

Backend (Serverless)
Netlify Functions: Para toda a lógica de backend, incluindo a comunicação segura com APIs externas.

Node.js: Ambiente de execução para as funções.

node-fetch: Para realizar chamadas diretas às APIs REST do DocuSign.

APIs e Serviços de Terceiros
DocuSign eSignature API: Para o fluxo completo de criação e gerenciamento de envelopes de assinatura.

DocuSign Navigator API: Para extração e análise de dados de contratos.

DocuSign.js SDK: Para a renderização da experiência de assinatura embutida.

📂 Estrutura do Projeto
O projeto segue uma organização clara para separar o frontend do backend:

/
├── frontend/                     # Raiz pública do site
│   ├── cliente/                  # Páginas da área restrita do cliente
│   │   ├── dashboard.html
│   │   └── insights.html
│   ├── scripts/                  # Scripts JavaScript do lado do cliente
│   │   ├── auth.js
│   │   ├── insights.js
│   │   └── assinatura-embarcada.js
│   ├── _header.html              # Componente de cabeçalho
│   ├── _footer.html              # Componente de rodapé
│   ├── assinatura-embarcada.html
│   └── login.html
│
├── netlify/
│   └── functions/                # Funções serverless (backend)
│       ├── docusign-actions.js
│       ├── navigator-actions.js
│       └── get-docusign-client-id.js
│
├── package.json                  # Dependências do projeto
└── netlify.toml                  # Configuração de build e deploy do Netlify

⚙️ Configuração do Ambiente Local
Para executar este projeto localmente, siga os passos abaixo:

1. Clone o Repositório

git clone [https://github.com/dolthub/dolt](https://github.com/dolthub/dolt)
cd fontara-financial-app

2. Instale as Dependências
Este projeto utiliza a Netlify CLI para emular o ambiente de produção localmente. Certifique-se de tê-la instalada: npm install -g netlify-cli.
Em seguida, instale as dependências do projeto:

npm install

3. Configure as Variáveis de Ambiente
Crie um arquivo chamado .env na raiz do seu projeto e adicione as seguintes variáveis. Substitua os valores pelos da sua conta de desenvolvedor DocuSign.

# Variáveis para autenticação com DocuSign
DOCUSIGN_IK=SEU_CLIENT_ID_DA_APLICAÇÃO_DOCUSIGN
DOCUSIGN_USER_ID=SEU_USER_ID_GUID_DOCUSIGN
DOCUSIGN_ACCOUNT_ID=SEU_ACCOUNT_ID_GUID_DOCUSIGN
DOCUSIGN_RSA_PEM_AS_BASE64=SUA_CHAVE_PRIVADA_CODIFICADA_EM_BASE64
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_BASE_PATH=[https://demo.docusign.net/restapi](https://demo.docusign.net/restapi)

4. Execute o Projeto
Use a Netlify CLI para iniciar o servidor de desenvolvimento local. Isso irá iniciar seu site e suas funções Netlify simultaneamente.

netlify dev

O site estará disponível em http://localhost:8888 (ou outra porta indicada no terminal).

🤝 Como Contribuir
Contribuições são bem-vindas! Para contribuir com o projeto, por favor, siga os seguintes passos:

Crie um fork do projeto.

Crie uma nova branch para sua feature (git checkout -b feature/minha-feature).

Faça o commit das suas alterações (git commit -m 'Adiciona minha-feature').

Faça o push para a branch (git push origin feature/minha-feature).a

Abra um Pull Request.

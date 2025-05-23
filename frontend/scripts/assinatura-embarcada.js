document.addEventListener('DOMContentLoaded', function() {
  console.log("assinatura-embarcada.js (v2): Script carregado.");

  // --- CONSTANTES ---
  const DEFAULT_DOC_PATH = "/assets/documentos/ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_PATH = "/assets/documentos/TermoAcordoRapido.pdf"; // Pode ser o mesmo que DEFAULT_DOC_PATH
  const DEFAULT_DOC_NAME = "ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_NAME = "TermoDeAcordoFontara.pdf";
  const DEFAULT_DOC_ID = "1";
  const CLICK_TO_AGREE_DOC_ID = "2"; // Usado se for um documento diferente para o "click to agree"
  const UPLOADED_DOC_ID_PREFIX = "user_uploaded_";

  // --- SELEÇÃO DE ELEMENTOS DOM ---
  const envelopeForm = document.getElementById('envelopeForm');
  const signerNameInput = document.getElementById('signerName');
  const signerEmailInput = document.getElementById('signerEmail');
  const emailSubjectInput = document.getElementById('emailSubject');
  
  const modeClassicRadio = document.getElementById('modeClassic');
  const modeFocusedRadio = document.getElementById('modeFocused');
  const modeClickToAgreeRadio = document.getElementById('modeClickToAgree');
  
  const documentChoiceContainer = document.getElementById('documentChoiceContainer');
  const docDefaultRadio = document.getElementById('docDefault');
  const docUploadRadio = document.getElementById('docUpload');
  const fileUploadContainer = document.getElementById('fileUploadContainer');
  const uploadedDocInput = document.getElementById('uploadedDoc');
  
  const submitEnvelopeBtn = document.getElementById('submitEnvelopeBtn');
  const submitBtnTextSpan = document.getElementById('submitBtnText'); // Span dentro do botão

  const docusignModalOverlay = document.getElementById('docusignSigningModalOverlay');
  const closeDocusignSigningModalBtn = document.getElementById('closeDocusignSigningModalBtn');
  const docusignIframe = document.getElementById('docusignSigningIframe');
  
  // ATENÇÃO: Ajuste esta URL para o ambiente correto do Docusign (ex: https://na*.docusign.net para produção)
  const docusignExpectedOrigin = "https://demo.docusign.net"; 
  let originalHeaderZIndex = ''; // Para gerenciar z-index do header

  // --- FUNÇÕES AUXILIARES ---

  function showElement(element, show) {
    if (element) {
      // Adiciona ou remove a classe 'tw-hidden' baseado no parâmetro 'show'
      element.classList.toggle('tw-hidden', !show);
    }
  }

  function updateDocumentFieldsVisibility() {
    // Obtém o valor do modo de assinatura selecionado
    const signingMode = document.querySelector('input[name="signingMode"]:checked')?.value;

    if (signingMode === 'clicktoagree') {
      // Para "Termo de Acordo Rápido", esconde as opções de escolha de documento e upload
      showElement(documentChoiceContainer, false);
      showElement(fileUploadContainer, false);
      if (uploadedDocInput) uploadedDocInput.required = false; // Garante que o upload não é obrigatório
      if (emailSubjectInput) emailSubjectInput.value = "Confirmação de Acordo Fontara Financial"; // Define assunto padrão
    } else {
      // Para outros modos (Clássico, Focado), mostra a escolha de documento
      showElement(documentChoiceContainer, true);
      // Reseta o assunto do email se estava como o de "Termo de Acordo Rápido"
      if (emailSubjectInput && emailSubjectInput.value === "Confirmação de Acordo Fontara Financial") {
         emailSubjectInput.value = "Documento Fontara Financial para Assinatura";
      }
      // Verifica se a opção de upload está selecionada para mostrar/esconder o campo de upload
      const isUploadSelected = docUploadRadio && docUploadRadio.checked;
      showElement(fileUploadContainer, isUploadSelected);
      if (uploadedDocInput) uploadedDocInput.required = isUploadSelected; // Define 'required' conforme a seleção
    }
  }

  async function fetchDocumentAsBase64(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        // Lança erro se a busca pelo documento falhar
        throw new Error(`Erro ao buscar o documento: ${response.statusText} (${filePath})`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Resolve com o conteúdo Base64 do arquivo
          if (reader.result) {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Falha ao ler o arquivo como Base64."));
          }
        };
        reader.onerror = error => reject(error); // Rejeita em caso de erro na leitura
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`[assinatura-embarcada.js] Erro em fetchDocumentAsBase64 para ${filePath}:`, error);
      alert(`Não foi possível carregar o documento padrão (${filePath.split('/').pop()}). Verifique o console.`);
      throw error; // Re-lança o erro para ser tratado pelo chamador
    }
  }

  function openDocusignSigningModal(url) {
    if (docusignIframe && docusignModalOverlay) {
      docusignIframe.src = url; // Define a URL do iframe para a URL de assinatura
      docusignModalOverlay.classList.remove('tw-hidden'); // Mostra o modal
      document.body.style.overflow = 'hidden'; // Impede o scroll do corpo da página
      // Ajusta o z-index do header para que o modal fique por cima
      const headerActual = document.querySelector('#header-placeholder header');
      if (headerActual) {
        originalHeaderZIndex = headerActual.style.zIndex; 
        headerActual.style.zIndex = '10'; 
      }
    }
  }

  function closeDocusignSigningModal() {
    if (docusignIframe && docusignModalOverlay) {
      docusignIframe.src = 'about:blank'; // Limpa o iframe
      docusignModalOverlay.classList.add('tw-hidden'); // Esconde o modal
      document.body.style.overflow = ''; // Restaura o scroll do corpo da página
      // Restaura o z-index original do header
      const headerActual = document.querySelector('#header-placeholder header');
      if (headerActual) {
        headerActual.style.zIndex = originalHeaderZIndex || ''; 
      }
    }
  }

  // --- EVENT LISTENERS ---

  // Adiciona listener para os botões de rádio do modo de assinatura
  document.querySelectorAll('input[name="signingMode"]').forEach(radio => {
    radio.addEventListener('change', updateDocumentFieldsVisibility);
  });

  // Listeners para as opções de escolha de documento (padrão ou upload)
  if (docDefaultRadio) {
    docDefaultRadio.addEventListener('change', () => {
        showElement(fileUploadContainer, false);
        if (uploadedDocInput) uploadedDocInput.required = false;
    });
  }
  if (docUploadRadio) {
    docUploadRadio.addEventListener('change', () => {
        showElement(fileUploadContainer, true);
        if (uploadedDocInput) uploadedDocInput.required = true;
    });
  }
  
  // Listener para o botão de fechar o modal
  if (closeDocusignSigningModalBtn) {
    closeDocusignSigningModalBtn.addEventListener('click', closeDocusignSigningModal);
  }
  // Listener para fechar o modal ao clicar fora da área de conteúdo do modal
  if (docusignModalOverlay) {
      docusignModalOverlay.addEventListener('click', function(event) {
          if (event.target === docusignModalOverlay) { // Verifica se o clique foi no overlay, não no conteúdo
              closeDocusignSigningModal();
          }
      });
  }

  // Listener para mensagens do iframe do Docusign (eventos de assinatura)
  window.addEventListener('message', function(event) {
    // Verifica se a mensagem vem da origem esperada do Docusign
    if (event.origin !== docusignExpectedOrigin) {
      return;
    }
    if (typeof event.data === 'string') {
      // Extrai parâmetros da mensagem
      const params = new URLSearchParams(event.data.startsWith('?') ? event.data.substring(1) : event.data);
      const docusignEvent = params.get('event');
      const envelopeIdFromEvent = params.get('envelopeId'); 
      console.log(`[Assinatura Embarcada] Evento Docusign recebido: ${docusignEvent}, EnvelopeID: ${envelopeIdFromEvent || 'N/A'}`);

      const signerNameFromForm = signerNameInput ? signerNameInput.value : 'Cliente';
      // Monta a URL base para redirecionamento para a página de agradecimento
      const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerNameFromForm)}&envelopeId=${envelopeIdFromEvent || ''}`;

      // Trata diferentes eventos do Docusign
      if (docusignEvent === 'signing_complete') {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=signing_complete`;
      } else if (['decline', 'cancel', 'session_timeout', 'ttl_expired', 'exception', 'viewing_complete'].includes(docusignEvent)) {
        // Outros eventos que indicam o fim da sessão de assinatura
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=${docusignEvent}`;
      }
    }
  }, false);

  // Listener para submissão do formulário de assinatura
  if (envelopeForm) {
    envelopeForm.addEventListener('submit', async function(event) {
      event.preventDefault(); // Impede a submissão padrão do formulário
      const originalButtonInnerHTML = submitEnvelopeBtn.innerHTML; // Salva o HTML interno original do botão
      
      // Desabilita o botão e mostra o spinner
      if (submitEnvelopeBtn && submitBtnTextSpan) {
        submitEnvelopeBtn.disabled = true;
        submitBtnTextSpan.innerHTML = '<div class="spinner-small" role="status" aria-hidden="true"></div> Processando...';
      }

      try {
        // Coleta dados do formulário
        const signerName = signerNameInput.value;
        const signerEmail = signerEmailInput.value;
        const emailSubjectVal = emailSubjectInput.value;
        
        const signingMode = document.querySelector('input[name="signingMode"]:checked').value;
        const documentChoice = (signingMode !== 'clicktoagree' && docDefaultRadio) ? 
                               document.querySelector('input[name="documentChoice"]:checked').value : 
                               'default'; // Para 'clicktoagree', sempre usa um documento padrão específico

        let documentBase64 = '';
        let documentName = '';
        let currentDocumentId = DEFAULT_DOC_ID;
        const documentFileExtension = 'pdf'; 

        // Determina qual documento usar e carrega seu conteúdo Base64
        if (signingMode === 'clicktoagree') {
          documentBase64 = await fetchDocumentAsBase64(CLICK_TO_AGREE_DOC_PATH);
          documentName = CLICK_TO_AGREE_DOC_NAME;
          currentDocumentId = CLICK_TO_AGREE_DOC_ID;
        } else if (documentChoice === 'default') {
          documentBase64 = await fetchDocumentAsBase64(DEFAULT_DOC_PATH);
          documentName = DEFAULT_DOC_NAME;
          currentDocumentId = DEFAULT_DOC_ID;
        } else { // 'upload'
          const file = uploadedDocInput.files[0];
          if (!file) throw new Error("Por favor, selecione um arquivo PDF.");
          if (file.type !== "application/pdf") throw new Error("Apenas arquivos PDF são permitidos.");
          documentName = file.name;
          currentDocumentId = UPLOADED_DOC_ID_PREFIX + Date.now(); // ID único para uploads
          documentBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
          });
        }

        if (!documentBase64) {
          throw new Error("Falha ao carregar o conteúdo do documento.");
        }
        
        // Cria um ID de cliente único para a sessão de assinatura embutida
        const clientUserId = `fontara_${signerEmail.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`; 

        // Monta o payload para criar o envelope no Docusign
        const envelopePayload = {
          emailSubject: emailSubjectVal,
          documents: [{ 
            name: documentName, 
            fileExtension: documentFileExtension, 
            documentId: String(currentDocumentId), // Garante que documentId é uma string
            documentBase64: documentBase64 
          }],
          recipients: {
            signers: [{
              email: signerEmail, name: signerName, recipientId: "1", 
              clientUserId: clientUserId, routingOrder: "1",
              // Define a âncora para a aba de assinatura no documento PDF
              tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] }
            }]
          },
          status: "sent" // Envia o envelope para assinatura imediatamente
        };
        
        console.log("[assinatura-embarcada.js] Payload para CREATE_DYNAMIC_ENVELOPE:", JSON.stringify({...envelopePayload, documents: [{...envelopePayload.documents[0], documentBase64: "REMOVIDO_DO_LOG"}]}));

        // Chama a Netlify Function para criar o envelope
        let response = await fetch('/.netlify/functions/docusign-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "CREATE_DYNAMIC_ENVELOPE", payload: envelopePayload })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`, details: response.statusText }));
          console.error("[assinatura-embarcada.js] Erro ao criar envelope:", errorData);
          throw new Error(errorData.details || errorData.error || `Falha ao criar envelope.`);
        }
        const envelopeResult = await response.json();
        const envelopeId = envelopeResult.envelopeId;
        if (!envelopeId) throw new Error("ID do envelope não retornado pela API.");
        
        // Determina se a visualização focada deve ser usada
        let useFocusedViewParam = false; // Padrão para 'classic'
        if (signingMode === 'focused' || signingMode === 'clicktoagree') {
            useFocusedViewParam = true; // Ativa para modo focado e termo de acordo rápido
        }
        
        // Monta o payload para obter a URL de visualização do destinatário
        const recipientViewPayload = {
          envelopeId: envelopeId, 
          signerEmail: signerEmail, 
          signerName: signerName,
          clientUserId: clientUserId,
          // URL de retorno de fallback (a principal é tratada pelo listener 'message')
          returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}`,
          useFocusedView: useFocusedViewParam // Passa o parâmetro para visualização focada
        };

        console.log("[assinatura-embarcada.js] Payload para GET_EMBEDDED_SIGNING_URL:", recipientViewPayload);

        // Chama a Netlify Function para obter a URL de assinatura
        response = await fetch('/.netlify/functions/docusign-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: "GET_EMBEDDED_SIGNING_URL", payload: recipientViewPayload })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`, details: response.statusText }));
          console.error("[assinatura-embarcada.js] Erro ao obter URL de assinatura:", errorData);
          throw new Error(errorData.details || errorData.error || `Falha ao obter URL de assinatura.`);
        }
        const signingResult = await response.json();
        const signingUrl = signingResult.signingUrl;

        if (signingUrl) {
          openDocusignSigningModal(signingUrl); // Abre o modal com a URL de assinatura
        } else {
          throw new Error("URL de assinatura não retornada pela API.");
        }

      } catch (error) {
        // Trata erros durante o processo
        console.error("[assinatura-embarcada.js] Erro no processo Docusign:", error.message, error.stack);
        alert(`Ocorreu um erro: ${error.message}`);
      } finally {
        // Restaura o botão para o estado original
        if(submitEnvelopeBtn) {
            submitEnvelopeBtn.disabled = false;
            submitEnvelopeBtn.innerHTML = originalButtonInnerHTML; // Restaura o HTML interno do botão
        }
      }
    });
  }

  // --- INICIALIZAÇÃO ---
  // Atualiza a visibilidade dos campos de documento ao carregar a página
  updateDocumentFieldsVisibility();

});

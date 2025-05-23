document.addEventListener('DOMContentLoaded', async function() { // Tornando async para buscar IK
  console.log("assinatura-embarcada.js (v4 com debug e init docusign.js): Script carregado.");

  // --- CONSTANTES ---
  const DEFAULT_DOC_PATH = "/assets/documentos/ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_PATH = "/assets/documentos/TermoAcordoRapido.pdf";
  const DEFAULT_DOC_NAME = "ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_NAME = "TermoDeAcordoFontara.pdf";
  const DEFAULT_DOC_ID = "1";
  const CLICK_TO_AGREE_DOC_ID = "2";
  const UPLOADED_DOC_ID_PREFIX = "user_uploaded_";

  // --- SELEÇÃO DE ELEMENTOS DOM ---
  // ... (mesmos elementos de antes)
  const envelopeForm = document.getElementById('envelopeForm');
  const signerNameInput = document.getElementById('signerName');
  const signerEmailInput = document.getElementById('signerEmail');
  const emailSubjectInput = document.getElementById('emailSubject');
  const documentChoiceContainer = document.getElementById('documentChoiceContainer');
  const docDefaultRadio = document.getElementById('docDefault');
  const docUploadRadio = document.getElementById('docUpload');
  const fileUploadContainer = document.getElementById('fileUploadContainer');
  const uploadedDocInput = document.getElementById('uploadedDoc');
  const submitEnvelopeBtn = document.getElementById('submitEnvelopeBtn');
  const submitBtnTextSpan = document.getElementById('submitBtnText');
  const docusignModalOverlay = document.getElementById('docusignSigningModalOverlay');
  const docusignModalTitle = document.getElementById('docusignModalTitle');
  const closeDocusignSigningModalBtn = document.getElementById('closeDocusignSigningModalBtn');
  const docusignIframeContainer = document.getElementById('docusignIframeContainer');
  const docusignSigningIframe = document.getElementById('docusignSigningIframe');
  const docusignFocusedViewContainer = document.getElementById('docusignFocusedViewContainer');
  
  const docusignExpectedOrigin = "https://demo.docusign.net";
  let originalHeaderZIndex = '';
  let currentSigningInstance = null;
  let lastRecipientViewContext = { envelopeId: null, signerName: null };
  let docusignSdk = null; // Para armazenar a instância inicializada do DocuSign SDK
  let DOCUSIGN_CLIENT_ID = null; // Para armazenar o IK/Client ID

  // --- FUNÇÃO PARA BUSCAR O DOCUSIGN CLIENT ID (IK) ---
  async function fetchDocusignClientId() {
    try {
      // Você precisará criar esta Netlify Function: get-docusign-client-id
      // Ela deve retornar algo como: { clientId: process.env.DOCUSIGN_IK }
      const response = await fetch('/.netlify/functions/get-docusign-client-id');
      if (!response.ok) {
        throw new Error(`Erro ao buscar Client ID Docusign: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.clientId) {
        throw new Error("Client ID Docusign não retornado pela função.");
      }
      console.log("[assinatura-embarcada.js] DOCUSIGN_CLIENT_ID (IK) obtido.");
      return data.clientId;
    } catch (error) {
      console.error("[assinatura-embarcada.js] Falha ao obter DOCUSIGN_CLIENT_ID:", error);
      // alert("Não foi possível obter a configuração necessária para Docusign.js. A visualização focada pode não funcionar.");
      return null; // Retorna null para que a aplicação possa tentar continuar sem ele, se aplicável
    }
  }

  // --- INICIALIZAÇÃO DO DOCUSIGN.JS SDK ---
  async function initializeDocusignSdk() {
    if (typeof DocuSign === 'undefined' || typeof DocuSign.loadDocuSign !== 'function') {
      console.error("[assinatura-embarcada.js] Objeto global DocuSign ou DocuSign.loadDocuSign não encontrado. Verifique se docusign.js foi carregado.");
      return null;
    }
    if (!DOCUSIGN_CLIENT_ID) {
        console.warn("[assinatura-embarcada.js] DOCUSIGN_CLIENT_ID não está disponível. Tentando carregar docusign.js sem ele para `signing({url})`.");
        // Para docusign.signing({url}), a inicialização com IK pode não ser estritamente necessária.
        // O objeto 'docusign' global já pode estar disponível apenas com o script tag.
        return window.docusign; // Retorna o objeto global se existir
    }

    try {
      console.log(`[assinatura-embarcada.js] Inicializando DocuSign.loadDocuSign com Client ID: ${DOCUSIGN_CLIENT_ID.substring(0,5)}...`);
      // A documentação usa DocuSign.loadDocuSign(CLIENT_ID)
      // O objeto 'docusign' global também pode ser usado se o loadDocuSign for chamado sem atribuição
      // ou se o script docusign.js já o define globalmente.
      // Vamos usar o retorno de loadDocuSign.
      const sdkInstance = await DocuSign.loadDocuSign(DOCUSIGN_CLIENT_ID);
      console.log("[assinatura-embarcada.js] DocuSign.js SDK inicializado com sucesso.");
      return sdkInstance; // Este 'sdkInstance' é o que tem o método 'signing'
    } catch (error) {
      console.error("[assinatura-embarcada.js] Erro ao inicializar DocuSign.js SDK com loadDocuSign:", error);
      // alert("Erro ao inicializar o Docusign.js SDK. A visualização focada pode não funcionar corretamente.");
      return window.docusign; // Fallback para o objeto global, caso exista
    }
  }
  
  // Buscar o Client ID e inicializar o SDK quando o DOM estiver pronto
  DOCUSIGN_CLIENT_ID = await fetchDocusignClientId();
  if (DOCUSIGN_CLIENT_ID) { // Só tenta inicialização com loadDocuSign se tivermos o Client ID
      docusignSdk = await initializeDocusignSdk();
  } else {
      // Se não conseguiu o Client ID, verifica se o objeto 'docusign' global existe do script tag
      if (typeof window.docusign !== 'undefined') {
          console.warn("[assinatura-embarcada.js] Usando objeto 'docusign' global pois Client ID não foi obtido.");
          docusignSdk = window.docusign;
      } else {
          console.error("[assinatura-embarcada.js] Objeto 'docusign' global não encontrado e Client ID não obtido.");
      }
  }


  // --- FUNÇÕES AUXILIARES (showElement, updateDocumentFieldsVisibility, fetchDocumentAsBase64, handleDocusignCompletionEvents) ---
  // ... (permanecem as mesmas da v3)
  function showElement(element, show) {
    if (element) {
      element.style.display = show ? (element.tagName === 'IFRAME' || element.classList.contains('modal-iframe-container') ? 'flex' : 'block') : 'none';
      if (element.tagName === 'INPUT' && element.type === 'file') {
         element.closest('.tw-hidden')?.classList.toggle('tw-hidden', !show);
      }
    }
  }
  
  function updateDocumentFieldsVisibility() {
    const signingMode = document.querySelector('input[name="signingMode"]:checked')?.value;
    if (!documentChoiceContainer) return;

    if (signingMode === 'clicktoagree') {
      showElement(documentChoiceContainer, false);
      showElement(fileUploadContainer, false);
      if (uploadedDocInput) uploadedDocInput.required = false;
      if (emailSubjectInput) emailSubjectInput.value = "Confirmação de Acordo Fontara Financial";
    } else {
      showElement(documentChoiceContainer, true);
      if (emailSubjectInput && emailSubjectInput.value === "Confirmação de Acordo Fontara Financial") {
         emailSubjectInput.value = "Documento Fontara Financial para Assinatura";
      }
      const isUploadSelected = docUploadRadio && docUploadRadio.checked;
      showElement(fileUploadContainer, isUploadSelected);
      if (uploadedDocInput) uploadedDocInput.required = isUploadSelected;
    }
  }

  async function fetchDocumentAsBase64(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Erro ao buscar o documento: ${response.statusText} (${filePath})`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Falha ao ler o arquivo como Base64."));
          }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`[assinatura-embarcada.js] Erro em fetchDocumentAsBase64 para ${filePath}:`, error);
      alert(`Não foi possível carregar o documento padrão (${filePath.split('/').pop()}). Verifique o console.`);
      throw error;
    }
  }
  
  function handleDocusignCompletionEvents(docusignEventData) {
    const eventName = docusignEventData.event;
    const envelopeId = docusignEventData.envelopeId || (docusignEventData.data && docusignEventData.data.envelopeId) || lastRecipientViewContext.envelopeId;
    const signerName = lastRecipientViewContext.signerName || 'Cliente';

    console.log(`[handleDocusignCompletionEvents] Evento: ${eventName}, EnvelopeID: ${envelopeId}`);

    const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerName)}&envelopeId=${envelopeId || ''}`;

    if (eventName === 'signing_complete') {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=signing_complete`;
    } else if (['decline', 'cancel', 'session_timeout', 'ttl_expired', 'exception', 'viewing_complete', 'session_end', 'close'].includes(eventName)) {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=${eventName}`;
    }
  }


  function openDocusignSigningModal(url, signingMode) {
    if(docusignModalTitle) docusignModalTitle.textContent = signingMode === 'classic' ? "Assinatura do Documento (Clássica)" : "Assinatura do Documento";

    if (signingMode === 'classic') {
        showElement(docusignIframeContainer, true);
        showElement(docusignFocusedViewContainer, false);
        if(docusignSigningIframe) docusignSigningIframe.src = url;
    } else { // 'focused' ou 'clicktoagree'
        showElement(docusignIframeContainer, false);
        showElement(docusignFocusedViewContainer, true);
        if(docusignFocusedViewContainer) docusignFocusedViewContainer.innerHTML = '';

        try {
            // Verifica se o docusignSdk (após DocuSign.loadDocuSign) ou o 'docusign' global está disponível
            const docusignInstanceToUse = docusignSdk || window.docusign;

            if (typeof docusignInstanceToUse === 'undefined' || typeof docusignInstanceToUse.signing !== 'function') {
                throw new Error("Biblioteca docusign.js (docusign.signing) não está pronta ou não foi carregada corretamente.");
            }
            currentSigningInstance = docusignInstanceToUse.signing({
                url: url,
                displayFormat: 'focused',
            });
            
            const sdkEventsToHandle = ['session_end', 'cancel', 'decline', 'exception', 'fax_pending', 'session_timeout', 'signing_complete', 'ttl_expired', 'viewing_complete', 'close'];
            sdkEventsToHandle.forEach(sdkEvent => {
                currentSigningInstance.on(sdkEvent, (eventData) => {
                    console.log(`[DocuSign.js SDK Event] ${sdkEvent}:`, eventData);
                    handleDocusignCompletionEvents({ 
                        event: sdkEvent, 
                        envelopeId: (eventData && eventData.data && eventData.data.envelopeId) || lastRecipientViewContext.envelopeId,
                        data: eventData
                    });
                });
            });
            
            currentSigningInstance.mount('#docusignFocusedViewContainer');
            console.log("[assinatura-embarcada.js] DocuSign Focused View montada.");

        } catch (error) {
            // LOG MELHORADO:
            console.error("[assinatura-embarcada.js] Erro ao montar DocuSign Focused View:", error);
            if (error.message) {
                console.error("Detalhe do erro (message):", error.message);
            }
            if (error.stack) {
                console.error("Stack trace:", error.stack);
            }
            console.error("Objeto de erro completo:", JSON.stringify(error, Object.getOwnPropertyNames(error)));


            alert("Erro ao carregar a visualização focada do documento. Tentando fallback para modo clássico. Verifique o console para detalhes.");
            showElement(docusignIframeContainer, true);
            showElement(docusignFocusedViewContainer, false);
            if(docusignSigningIframe) docusignSigningIframe.src = url;
        }
    }
    if(docusignModalOverlay) docusignModalOverlay.classList.remove('tw-hidden');
    document.body.style.overflow = 'hidden';
    const headerActual = document.querySelector('#header-placeholder header');
    if (headerActual) {
      originalHeaderZIndex = headerActual.style.zIndex; 
      headerActual.style.zIndex = '10'; 
    }
  }

  function closeDocusignSigningModal() {
    // ... (mesma função da v3, sem alterações)
    if (currentSigningInstance) {
        try {
        } catch (e) {
            console.warn("[assinatura-embarcada.js] Erro ao tentar desmontar instância docusign.js:", e);
        }
        if(docusignFocusedViewContainer) docusignFocusedViewContainer.innerHTML = '';
        currentSigningInstance = null;
    }
    if (docusignSigningIframe) docusignSigningIframe.src = 'about:blank';
    if (docusignModalOverlay) docusignModalOverlay.classList.add('tw-hidden');
    document.body.style.overflow = '';
    const headerActual = document.querySelector('#header-placeholder header');
    if (headerActual) {
      headerActual.style.zIndex = originalHeaderZIndex || ''; 
    }
  }

  // --- EVENT LISTENERS ---
  // ... (mesmos listeners da v3, sem alterações)
  document.querySelectorAll('input[name="signingMode"]').forEach(radio => {
    radio.addEventListener('change', updateDocumentFieldsVisibility);
  });
  if (docDefaultRadio) docDefaultRadio.addEventListener('change', () => { updateDocumentFieldsVisibility(); });
  if (docUploadRadio) docUploadRadio.addEventListener('change', () => { updateDocumentFieldsVisibility(); });
  if (closeDocusignSigningModalBtn) closeDocusignSigningModalBtn.addEventListener('click', closeDocusignSigningModal);
  if (docusignModalOverlay) {
      docusignModalOverlay.addEventListener('click', function(event) {
          if (event.target === docusignModalOverlay) closeDocusignSigningModal();
      });
  }
  window.addEventListener('message', function(event) {
    if (document.querySelector('input[name="signingMode"]:checked')?.value !== 'classic') {
        return;
    }
    if (event.origin !== docusignExpectedOrigin) return;

    if (typeof event.data === 'string') {
      const params = new URLSearchParams(event.data.startsWith('?') ? event.data.substring(1) : event.data);
      const docusignEventName = params.get('event');
      const envelopeIdFromEvent = params.get('envelopeId');
      console.log(`[PostMessage Event - Classic] Evento: ${docusignEventName}, EnvelopeID: ${envelopeIdFromEvent}`);
      handleDocusignCompletionEvents({ event: docusignEventName, envelopeId: envelopeIdFromEvent });
    }
  }, false);

  if (envelopeForm) {
    envelopeForm.addEventListener('submit', async function(event) {
      // ... (mesma lógica de submit da v3, sem alterações na estrutura principal)
      // Garanta que `lastRecipientViewContext` está sendo atualizado corretamente
      event.preventDefault();
      const originalButtonInnerHTML = submitEnvelopeBtn.innerHTML;
      
      if (submitEnvelopeBtn && submitBtnTextSpan) {
        submitEnvelopeBtn.disabled = true;
        submitBtnTextSpan.innerHTML = '<div class="spinner-small" role="status" aria-hidden="true"></div> Processando...';
      }

      try {
        const signerName = signerNameInput.value;
        const signerEmail = signerEmailInput.value;
        const emailSubjectVal = emailSubjectInput.value;
        const signingMode = document.querySelector('input[name="signingMode"]:checked').value;
        const documentChoice = (signingMode !== 'clicktoagree' && docDefaultRadio) ? 
                               document.querySelector('input[name="documentChoice"]:checked').value : 
                               'default';

        let documentBase64 = '', documentName = '', currentDocumentId = DEFAULT_DOC_ID;
        const documentFileExtension = 'pdf'; 

        if (signingMode === 'clicktoagree') {
          documentBase64 = await fetchDocumentAsBase64(CLICK_TO_AGREE_DOC_PATH);
          documentName = CLICK_TO_AGREE_DOC_NAME;
          currentDocumentId = CLICK_TO_AGREE_DOC_ID;
        } else if (documentChoice === 'default') {
          documentBase64 = await fetchDocumentAsBase64(DEFAULT_DOC_PATH);
          documentName = DEFAULT_DOC_NAME;
          currentDocumentId = DEFAULT_DOC_ID;
        } else {
          const file = uploadedDocInput.files[0];
          if (!file) throw new Error("Por favor, selecione um arquivo PDF.");
          if (file.type !== "application/pdf") throw new Error("Apenas arquivos PDF são permitidos.");
          documentName = file.name;
          currentDocumentId = UPLOADED_DOC_ID_PREFIX + Date.now();
          documentBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
          });
        }
        if (!documentBase64) throw new Error("Falha ao carregar o conteúdo do documento.");
        
        const clientUserId = `fontara_${signerEmail.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`; 
        lastRecipientViewContext = { envelopeId: null, signerName: signerName };

        const envelopePayload = {
            emailSubject: emailSubjectVal,
            documents: [{ name: documentName, fileExtension: documentFileExtension, documentId: String(currentDocumentId), documentBase64: documentBase64 }],
            recipients: { signers: [{ email: signerEmail, name: signerName, recipientId: "1", clientUserId: clientUserId, routingOrder: "1", tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] } }] },
            status: "sent"
        };
        console.log("[assinatura-embarcada.js] Payload para CREATE_DYNAMIC_ENVELOPE:", JSON.stringify({...envelopePayload, documents: [{...envelopePayload.documents[0], documentBase64: "REMOVIDO_DO_LOG"}]}));

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
        
        lastRecipientViewContext.envelopeId = envelopeId;

        let useFocusedViewParam = (signingMode === 'focused' || signingMode === 'clicktoagree');
        
        const recipientViewPayload = {
            envelopeId: envelopeId, 
            signerEmail: signerEmail, 
            signerName: signerName,
            clientUserId: clientUserId,
            returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}`,
            useFocusedView: useFocusedViewParam
        };
        console.log("[assinatura-embarcada.js] Payload para GET_EMBEDDED_SIGNING_URL:", recipientViewPayload);

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
          openDocusignSigningModal(signingUrl, signingMode);
        } else {
          throw new Error("URL de assinatura não retornada pela API.");
        }

      } catch (error) {
          console.error("[assinatura-embarcada.js] Erro no processo Docusign (submit):", error.message, error.stack);
          alert(`Ocorreu um erro: ${error.message}`);
      } finally {
          if(submitEnvelopeBtn) {
              submitEnvelopeBtn.disabled = false;
              submitEnvelopeBtn.innerHTML = originalButtonInnerHTML;
          }
      }
    });
  }
  updateDocumentFieldsVisibility();
});

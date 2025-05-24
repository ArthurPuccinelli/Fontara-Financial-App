// frontend/scripts/assinatura-embarcada.js
document.addEventListener('DOMContentLoaded', async function() {
  console.log("assinatura-embarcada.js (vFinal-Rev1 - Eventos Simplificados): Script carregado.");

  // --- CONSTANTES ---
  const DEFAULT_DOC_PATH = "/assets/documentos/ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_PATH = "/assets/documentos/TermoAcordoRapido.pdf";
  const DEFAULT_DOC_NAME = "ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_NAME = "TermoDeAcordoFontara.pdf";
  const DEFAULT_DOC_ID = "1";
  const CLICK_TO_AGREE_DOC_ID = "2";
  const UPLOADED_DOC_ID_PREFIX = "user_uploaded_";

  // --- SELEÇÃO DE ELEMENTOS DOM ---
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
  let docusignApi = null; 
  let DOCUSIGN_APP_CLIENT_ID = null;

  async function fetchDocusignAppClientId() {
    try {
      const response = await fetch('/.netlify/functions/get-docusign-client-id');
      if (!response.ok) {
        throw new Error(`Erro ao buscar App Client ID DocuSign: ${response.statusText} (status: ${response.status})`);
      }
      const data = await response.json();
      if (!data.clientId) {
        throw new Error("App Client ID DocuSign (IK) não retornado pela função get-docusign-client-id.");
      }
      console.log("[assinatura-embarcada.js] DOCUSIGN_APP_CLIENT_ID (IK) obtido com sucesso.");
      return data.clientId;
    } catch (error) {
      console.error("[assinatura-embarcada.js] Falha ao obter DOCUSIGN_APP_CLIENT_ID (IK):", error.message);
      return null;
    }
  }
  
  let sdkInitializationAttempted = false;
  let sdkInitializationSuccessful = false;

  async function initializeDocuSignSdk() {
    if (sdkInitializationAttempted) {
        console.log("[assinatura-embarcada.js] Tentativa de inicialização do SDK já ocorreu.");
        return;
    }
    sdkInitializationAttempted = true;
    console.log("[assinatura-embarcada.js] Tentando inicializar SDK DocuSign...");

    try {
      if (typeof window.DocuSign === 'undefined' || typeof window.DocuSign.loadDocuSign !== 'function') {
        console.error("[assinatura-embarcada.js] FALHA CRÍTICA: Objeto global window.DocuSign ou window.DocuSign.loadDocuSign não encontrado.");
        return; 
      }
      
      DOCUSIGN_APP_CLIENT_ID = await fetchDocusignAppClientId();
      
      if (DOCUSIGN_APP_CLIENT_ID) {
        console.log(`[assinatura-embarcada.js] Chamando window.DocuSign.loadDocuSign com App Client ID (IK): ${DOCUSIGN_APP_CLIENT_ID.substring(0,5)}...`);
        const loadedInstance = await window.DocuSign.loadDocuSign(DOCUSIGN_APP_CLIENT_ID); 
        console.log("[assinatura-embarcada.js] window.DocuSign.loadDocuSign completado.");
        
        if (loadedInstance && typeof loadedInstance.signing === 'function') {
          docusignApi = loadedInstance; 
          sdkInitializationSuccessful = true;
          console.log("[assinatura-embarcada.js] SDK DocuSign (retornado por loadDocuSign) está pronto. Objeto:", docusignApi);
        } else {
          console.error("[assinatura-embarcada.js] FALHA CRÍTICA: loadDocuSign não retornou SDK válido. Retorno:", loadedInstance);
          if (typeof window.docusign !== 'undefined' && window.docusign !== null && typeof window.docusign.signing === 'function') {
            console.warn("[assinatura-embarcada.js] Usando window.docusign (minúsculo) como fallback.");
            docusignApi = window.docusign;
            sdkInitializationSuccessful = true; 
          } else {
            console.error("[assinatura-embarcada.js] Fallback para window.docusign (minúsculo) falhou.");
          }
        }
      } else {
        console.warn("[assinatura-embarcada.js] IK não obtido. Tentando usar window.docusign (minúsculo) diretamente.");
         if (typeof window.docusign !== 'undefined' && window.docusign !== null && typeof window.docusign.signing === 'function') {
            docusignApi = window.docusign; 
            sdkInitializationSuccessful = true;
            console.log("[assinatura-embarcada.js] Usando window.docusign (minúsculo) diretamente.");
        } else {
             console.error("[assinatura-embarcada.js] window.docusign (minúsculo) não disponível e IK não obtido.");
        }
      }
    } catch (error) {
      console.error("[assinatura-embarcada.js] Erro EXCEPCIONAL durante a inicialização do SDK DocuSign:", error.message, error.stack);
    }

    if (!sdkInitializationSuccessful) {
      console.warn("[assinatura-embarcada.js] SDK DocuSign não foi inicializado com sucesso. Visualização Focada pode falhar.");
    }
  }
  
  await initializeDocuSignSdk(); 

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
    // O evento 'sessionEnd' do docusign.js fornece os detalhes no eventData.data
    // Outros eventos podem ter uma estrutura ligeiramente diferente.
    const eventName = docusignEventData.event; // Este é o nome do evento do SDK ('ready', 'sessionEnd', etc.)
    let finalStatus = eventName; // Nome do evento SDK como fallback

    // Para 'sessionEnd', o tipo real está em eventData.data.type ou eventData.data.sessionEndType
    if (eventName === 'sessionEnd' && docusignEventData.data) {
        finalStatus = docusignEventData.data.type || docusignEventData.data.sessionEndType || 'unknown_session_end';
    } else if (docusignEventData.type) { // Alguns eventos podem ter 'type' diretamente no objeto eventData
        finalStatus = docusignEventData.type;
    }
    
    // Normaliza para os nomes de evento que o returnUrl espera
    if (finalStatus.toLowerCase().includes('signing_complete')) finalStatus = 'signing_complete';
    else if (finalStatus.toLowerCase().includes('cancel')) finalStatus = 'cancel';
    else if (finalStatus.toLowerCase().includes('decline')) finalStatus = 'decline';
    // Adicione outras normalizações se necessário

    const envelopeId = (docusignEventData.data && docusignEventData.data.envelopeId) || lastRecipientViewContext.envelopeId;
    const signerName = lastRecipientViewContext.signerName || 'Cliente';

    console.log(`[handleDocusignCompletionEvents] Status Final: ${finalStatus}, EnvelopeID: ${envelopeId}`);

    const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerName)}&envelopeId=${envelopeId || ''}`;

    if (finalStatus === 'signing_complete') {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=signing_complete`;
    } else if (['decline', 'cancel', 'session_timeout', 'ttl_expired', 'exception', 'viewing_complete', 'unknown_session_end'].includes(finalStatus)) {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=${finalStatus}`;
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
            if (!sdkInitializationSuccessful || typeof docusignApi === 'undefined' || docusignApi === null) {
                let errorMsg = "SDK DocuSign (docusignApi) não está inicializado ou disponível. ";
                if (typeof window.DocuSign === 'undefined') {
                    errorMsg += "Causa: 'window.DocuSign' (bundle.js) não carregou.";
                } else if (!docusignApi) { 
                    errorMsg += "Causa: 'loadDocuSign' falhou ou não retornou uma instância válida.";
                }
                console.error("[assinatura-embarcada.js]", errorMsg);
                throw new Error(errorMsg);
            }
            if (typeof docusignApi.signing !== 'function') {
                console.error("[assinatura-embarcada.js] docusignApi.signing não é uma função. Objeto:", docusignApi);
                throw new Error("docusignApi.signing não encontrado.");
            }
            
            console.log("[assinatura-embarcada.js] Chamando docusignApi.signing() com url:", url);
            currentSigningInstance = docusignApi.signing({
                url: url,
                displayFormat: 'focused',
            });
            
            console.log("[assinatura-embarcada.js] Resultado de docusignApi.signing():", currentSigningInstance);

            if (!currentSigningInstance || typeof currentSigningInstance.on !== 'function') {
                console.error("[assinatura-embarcada.js] currentSigningInstance.on não é uma função ou é inválido:", currentSigningInstance);
                throw new Error("Falha ao criar instância de assinatura DocuSign válida.");
            }
            
            // Simplificando listeners de evento conforme exemplo DocuSign
            console.log("[assinatura-embarcada.js] Adicionando listener para 'ready'");
            currentSigningInstance.on('ready', (event) => {
                console.log('[DocuSign.js SDK Event] ready:', event);
                // UI está renderizada, não precisa de ação específica aqui a menos que queira logar ou mostrar algo
            });

            console.log("[assinatura-embarcada.js] Adicionando listener para 'sessionEnd'");
            currentSigningInstance.on('sessionEnd', (eventData) => { // 'event' no exemplo deles, aqui eventData para clareza
                console.log('[DocuSign.js SDK Event] sessionEnd:', eventData);
                handleDocusignCompletionEvents({ 
                    event: 'sessionEnd', // Passa o nome do evento SDK
                    // sessionEndType e outros detalhes estarão em eventData.data
                    data: eventData, // Passa o objeto de evento completo do SDK
                    envelopeId: lastRecipientViewContext.envelopeId // Garante que temos o envelopeId
                });
            });
            
            console.log("[assinatura-embarcada.js] Montando em #docusignFocusedViewContainer...");
            currentSigningInstance.mount('#docusignFocusedViewContainer');
            console.log("[assinatura-embarcada.js] DocuSign Focused View montada com sucesso.");

        } catch (error) {
            console.error("[assinatura-embarcada.js] Erro ao montar DocuSign Focused View:", error);
            if (error.message) console.error("Detalhe do erro (message):", error.message);
            if (error.stack) console.error("Stack trace:", error.stack);

            alert(`Erro ao carregar a visualização focada: ${error.message}. Tentando fallback. Verifique o console.`);
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
    if (currentSigningInstance) {
        try {
            if (typeof currentSigningInstance.destroy === 'function') {
                console.log("[assinatura-embarcada.js] Chamando currentSigningInstance.destroy()");
                currentSigningInstance.destroy();
            }
        } catch (e) {
            console.warn("[assinatura-embarcada.js] Erro ao tentar destruir instância docusign.js:", e);
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
      event.preventDefault();
      const originalButtonInnerHTML = submitEnvelopeBtn.innerHTML;
      
      if (submitEnvelopeBtn && submitBtnTextSpan) {
        submitEnvelopeBtn.disabled = true;
        submitBtnTextSpan.innerHTML = '<div class="spinner-small" role="status" aria-hidden="true"></div> Processando...';
      }

      try {
        if (!sdkInitializationAttempted) {
            console.log("[assinatura-embarcada.js] SDK não inicializado na carga, tentando antes do submit...");
            await initializeDocuSignSdk();
        }
        const currentSigningMode = document.querySelector('input[name="signingMode"]:checked').value;
        if (currentSigningMode !== 'classic' && !sdkInitializationSuccessful) {
            throw new Error("Falha na inicialização do SDK DocuSign. Verifique o console para detalhes. A Visualização Focada não está disponível.");
        }

        const signerName = signerNameInput.value;
        const signerEmail = signerEmailInput.value;
        const emailSubjectVal = emailSubjectInput.value;
        const documentChoice = (currentSigningMode !== 'clicktoagree' && docDefaultRadio) ? 
                               document.querySelector('input[name="documentChoice"]:checked').value : 
                               'default';

        let documentBase64 = '', documentName = '', currentDocumentId = DEFAULT_DOC_ID;
        const documentFileExtension = 'pdf'; 

        if (currentSigningMode === 'clicktoagree') {
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
        lastRecipientViewContext = { envelopeId: null, signerName: signerName }; // Salva signerName para usar no handleDocusignCompletionEvents

        const envelopePayload = {
            emailSubject: emailSubjectVal,
            documents: [{ name: documentName, fileExtension: documentFileExtension, documentId: String(currentDocumentId), documentBase64: documentBase64 }],
            recipients: { signers: [{ email: signerEmail, name: signerName, recipientId: "1", clientUserId: clientUserId, routingOrder: "1", tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] } }] },
            status: "sent"
        };
        // console.log("[assinatura-embarcada.js] Payload para CREATE_DYNAMIC_ENVELOPE:", JSON.stringify({...envelopePayload, documents: [{...envelopePayload.documents[0], documentBase64: "REMOVIDO_DO_LOG"}]}));

        let response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "CREATE_DYNAMIC_ENVELOPE", payload: envelopePayload })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`, details: response.statusText }));
            // console.error("[assinatura-embarcada.js] Erro ao criar envelope:", errorData);
            throw new Error(errorData.details || errorData.error || `Falha ao criar envelope.`);
        }
        const envelopeResult = await response.json();
        const envelopeId = envelopeResult.envelopeId;
        if (!envelopeId) throw new Error("ID do envelope não retornado pela API.");
        
        lastRecipientViewContext.envelopeId = envelopeId; // Atualiza envelopeId no contexto

        let useFocusedViewParam = (currentSigningMode === 'focused' || currentSigningMode === 'clicktoagree');
        
        const recipientViewPayload = {
            envelopeId: envelopeId, 
            signerEmail: signerEmail, 
            signerName: signerName,
            clientUserId: clientUserId,
            returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}`,
            useFocusedView: useFocusedViewParam
        };
        // console.log("[assinatura-embarcada.js] Payload para GET_EMBEDDED_SIGNING_URL:", recipientViewPayload);

        response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "GET_EMBEDDED_SIGNING_URL", payload: recipientViewPayload })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`, details: response.statusText }));
            // console.error("[assinatura-embarcada.js] Erro ao obter URL de assinatura:", errorData);
            throw new Error(errorData.details || errorData.error || `Falha ao obter URL de assinatura.`);
        }
        const signingResult = await response.json();
        const signingUrl = signingResult.signingUrl;

        if (signingUrl) {
          openDocusignSigningModal(signingUrl, currentSigningMode);
        } else {
          throw new Error("URL de assinatura não retornada pela API.");
        }

      } catch (error) {
          console.error("[assinatura-embarcada.js] Erro no processo Docusign (submit):", error.message, error.stack);
          alert(`Ocorreu um erro: ${error.message}`); // A mensagem de erro agora será mais específica
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

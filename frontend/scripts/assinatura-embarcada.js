// frontend/scripts/assinatura-embarcada.js
document.addEventListener('DOMContentLoaded', async function() {
  console.log("assinatura-embarcada.js (vFinal-Rev3 - Melhorias UX): Script carregado.");

  // --- CONSTANTES ---
  const DEFAULT_DOC_PATH = "/assets/documentos/ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_PATH = "/assets/documentos/TermoAcordoRapido.pdf";
  const DEFAULT_DOC_NAME = "ContratoPadraoFontara.pdf";
  const CLICK_TO_AGREE_DOC_NAME = "TermoDeAcordoFontara.pdf";
  const DEFAULT_DOC_ID = "1";
  const CLICK_TO_AGREE_DOC_ID = "2";
  const UPLOADED_DOC_ID = "1"; // << Correção do bug: usar sempre um ID numérico válido para o documento único no envelope.

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
  const submitEnvelopeBtn = document.getElementById('submitEnvelopeBtn'); // O botão inteiro
  const docusignModalOverlay = document.getElementById('docusignSigningModalOverlay');
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
      if (!response.ok) throw new Error(`Erro ao buscar App Client ID: ${response.statusText}`);
      const data = await response.json();
      if (!data.clientId) throw new Error("App Client ID (IK) não retornado pela função.");
      console.log("[assinatura-embarcada.js] IK obtido.");
      return data.clientId;
    } catch (error) {
      console.error("[assinatura-embarcada.js] Falha ao obter IK:", error.message);
      return null;
    }
  }
  
  let sdkInitializationAttempted = false;
  let sdkInitializationSuccessful = false;

  async function initializeDocuSignSdk() {
    if (sdkInitializationAttempted) return;
    sdkInitializationAttempted = true;

    try {
      if (typeof window.DocuSign === 'undefined' || typeof window.DocuSign.loadDocuSign !== 'function') {
        console.error("[assinatura-embarcada.js] FALHA CRÍTICA: window.DocuSign não encontrado.");
        return; 
      }
      
      DOCUSIGN_APP_CLIENT_ID = await fetchDocusignAppClientId();
      
      if (DOCUSIGN_APP_CLIENT_ID) {
        const loadedInstance = await window.DocuSign.loadDocuSign(DOCUSIGN_APP_CLIENT_ID); 
        
        if (loadedInstance && typeof loadedInstance.signing === 'function') {
          docusignApi = loadedInstance; 
          sdkInitializationSuccessful = true;
          console.log("[assinatura-embarcada.js] SDK DocuSign está pronto.");
        } else {
          console.error("[assinatura-embarcada.js] FALHA CRÍTICA: loadDocuSign não retornou SDK válido.");
        }
      } else {
        console.warn("[assinatura-embarcada.js] IK não obtido.");
      }
    } catch (error) {
      console.error("[assinatura-embarcada.js] Erro na inicialização do SDK:", error.message, error.stack);
    }

    if (!sdkInitializationSuccessful) {
      console.warn("[assinatura-embarcada.js] Inicialização do SDK falhou.");
    }
  }
  
  await initializeDocuSignSdk(); 

  // --- FUNÇÕES AUXILIARES ---
  function showElement(element, show) {
    if (!element) return;
    // A tag <details> funciona nativamente para expandir/recolher
    // Apenas controlamos o container de upload
    if (element.id === 'fileUploadContainer') {
        element.classList.toggle('tw-hidden', !show);
    } else {
        element.style.display = show ? 'block' : 'none';
    }
  }
  
  function updateDocumentFieldsVisibility() {
    const signingMode = document.querySelector('input[name="signingMode"]:checked')?.value;
    if (!documentChoiceContainer) return;

    showElement(documentChoiceContainer, signingMode !== 'clicktoagree');
    
    if (signingMode === 'clicktoagree') {
      if (emailSubjectInput) emailSubjectInput.value = "Confirmação de Acordo Fontara Financial";
    } else {
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
      if (!response.ok) throw new Error(`Erro ao buscar documento: ${response.statusText}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => reader.result ? resolve(reader.result.split(',')[1]) : reject(new Error("Falha ao ler arquivo."));
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`[assinatura-embarcada.js] Erro em fetchDocumentAsBase64 para ${filePath}:`, error);
      alert(`Não foi possível carregar o documento padrão. Verifique o console.`);
      throw error;
    }
  }
  
  function handleDocusignCompletionEvents(docusignEventData) {
    const eventName = docusignEventData.event;
    let finalStatus = eventName; 

    if (eventName === 'sessionEnd' && docusignEventData.data) {
        finalStatus = docusignEventData.data.type || docusignEventData.data.sessionEndType || 'unknown_session_end';
    }
    
    if (finalStatus.toLowerCase().includes('signing_complete')) finalStatus = 'signing_complete';
    else if (finalStatus.toLowerCase().includes('cancel')) finalStatus = 'cancel';
    else if (finalStatus.toLowerCase().includes('decline')) finalStatus = 'decline';

    const envelopeId = (docusignEventData.data && docusignEventData.data.envelopeId) || lastRecipientViewContext.envelopeId;
    const signerName = lastRecipientViewContext.signerName || 'Cliente';

    const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerName)}&envelopeId=${envelopeId || ''}`;

    if (finalStatus === 'signing_complete') {
        window.location.href = `${returnUrlBase}&event=signing_complete`;
    } else if (['decline', 'cancel', 'session_timeout', 'ttl_expired', 'exception', 'viewing_complete', 'unknown_session_end'].includes(finalStatus)) {
        window.location.href = `${returnUrlBase}&event=${finalStatus}`;
    }
    closeDocusignSigningModal(); 
  }

  function openDocusignSigningModal(url, signingMode) {
    const useIframe = (signingMode === 'classic');
    
    docusignIframeContainer.style.display = useIframe ? 'flex' : 'none';
    docusignFocusedViewContainer.style.display = useIframe ? 'none' : 'block';
    
    if (useIframe) {
        if(docusignSigningIframe) docusignSigningIframe.src = url;
    } else { 
        if(docusignFocusedViewContainer) docusignFocusedViewContainer.innerHTML = '';

        try {
            if (!sdkInitializationSuccessful || !docusignApi) {
                let errorMsg = "SDK DocuSign não inicializado. ";
                if (typeof window.DocuSign === 'undefined') errorMsg += "Causa: 'bundle.js' não carregou.";
                else if (!docusignApi) errorMsg += "Causa: 'loadDocuSign' falhou.";
                throw new Error(errorMsg);
            }
            
            currentSigningInstance = docusignApi.signing({ url: url, displayFormat: 'focused' });
            if (!currentSigningInstance || typeof currentSigningInstance.on !== 'function') throw new Error("Falha ao criar instância de assinatura.");
            
            currentSigningInstance.on('ready', (event) => console.log('[DocuSign.js SDK Event] ready:', event));
            currentSigningInstance.on('sessionEnd', (eventData) => handleDocusignCompletionEvents({ event: 'sessionEnd', data: eventData }));
            
            currentSigningInstance.mount('#docusignFocusedViewContainer');
        } catch (error) {
            console.error("[assinatura-embarcada.js] Erro ao montar Visualização Focada:", error);
            alert(`Erro ao carregar a visualização focada: ${error.message}. Tentando fallback.`);
            docusignIframeContainer.style.display = 'flex';
            docusignFocusedViewContainer.style.display = 'none';
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
        try { if (typeof currentSigningInstance.destroy === 'function') currentSigningInstance.destroy(); } 
        catch (e) { console.warn("[assinatura-embarcada.js] Erro ao destruir instância docusign.js:", e); }
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
  document.querySelectorAll('input[name="signingMode"]').forEach(radio => radio.addEventListener('change', updateDocumentFieldsVisibility));
  
  if (docDefaultRadio && docUploadRadio) {
      // Função unificada para lidar com a mudança na escolha do documento
      const handleDocChoiceChange = () => {
          const isUploadSelected = docUploadRadio.checked;
          showElement(fileUploadContainer, isUploadSelected);
          if (uploadedDocInput) uploadedDocInput.required = isUploadSelected;
      };
      docDefaultRadio.addEventListener('change', handleDocChoiceChange);
      docUploadRadio.addEventListener('change', handleDocChoiceChange);
  }

  if (closeDocusignSigningModalBtn) closeDocusignSigningModalBtn.addEventListener('click', closeDocusignSigningModal);
  if (docusignModalOverlay) {
      docusignModalOverlay.addEventListener('click', (event) => {
          if (event.target === docusignModalOverlay) closeDocusignSigningModal();
      });
  }
  window.addEventListener('message', function(event) {
    if (document.querySelector('input[name="signingMode"]:checked')?.value !== 'classic') return;
    if (event.origin !== docusignExpectedOrigin) return;
    if (typeof event.data === 'string') {
      const params = new URLSearchParams(event.data.startsWith('?') ? event.data.substring(1) : event.data);
      handleDocusignCompletionEvents({ event: params.get('event'), envelopeId: params.get('envelopeId') });
    }
  }, false);
  
  if (envelopeForm) {
    envelopeForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      const originalButtonInnerHTML = submitEnvelopeBtn.innerHTML; 
      
      if (submitEnvelopeBtn) {
        submitEnvelopeBtn.disabled = true;
        submitEnvelopeBtn.innerHTML = '<div class="spinner-small" role="status" aria-hidden="true"></div> Processando...';
      }

      try {
        if (!sdkInitializationAttempted) await initializeDocuSignSdk();
        
        const currentSigningMode = document.querySelector('input[name="signingMode"]:checked').value;
        if (currentSigningMode !== 'classic' && !sdkInitializationSuccessful) {
            throw new Error("Falha na inicialização do SDK DocuSign. A Visualização Focada não está disponível.");
        }

        const signerName = signerNameInput.value;
        const signerEmail = signerEmailInput.value;
        const emailSubjectVal = emailSubjectInput.value;
        const documentChoice = (docUploadRadio && docUploadRadio.checked) ? 'upload' : 'default';

        let documentBase64 = '', documentName = '', currentDocumentId;

        if (currentSigningMode === 'clicktoagree') {
          documentBase64 = await fetchDocumentAsBase64(CLICK_TO_AGREE_DOC_PATH);
          documentName = CLICK_TO_AGREE_DOC_NAME;
          currentDocumentId = CLICK_TO_AGREE_DOC_ID;
        } else if (documentChoice === 'default') {
          documentBase64 = await fetchDocumentAsBase64(DEFAULT_DOC_PATH);
          documentName = DEFAULT_DOC_NAME;
          currentDocumentId = DEFAULT_DOC_ID;
        } else { // upload
          const file = uploadedDocInput.files[0];
          if (!file) throw new Error("Por favor, selecione um arquivo PDF para enviar.");
          if (file.type !== "application/pdf") throw new Error("Apenas arquivos PDF são permitidos.");
          documentName = file.name;
          currentDocumentId = UPLOADED_DOC_ID; // <<<<< Correção do Bug aqui
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
            documents: [{ name: documentName, fileExtension: 'pdf', documentId: String(currentDocumentId), documentBase64: documentBase64 }],
            recipients: { signers: [{ email: signerEmail, name: signerName, recipientId: "1", clientUserId: clientUserId, routingOrder: "1", tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] } }] },
            status: "sent"
        };
        
        let response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "CREATE_DYNAMIC_ENVELOPE", payload: envelopePayload })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`}));
            throw new Error(errorData.details || errorData.error || `Falha ao criar envelope.`);
        }
        const envelopeResult = await response.json();
        const envelopeId = envelopeResult.envelopeId;
        if (!envelopeId) throw new Error("ID do envelope não retornado pela API.");
        
        lastRecipientViewContext.envelopeId = envelopeId; 

        let useFocusedViewParam = (currentSigningMode === 'focused' || currentSigningMode === 'clicktoagree');
        
        const recipientViewPayload = {
            envelopeId: envelopeId, 
            signerEmail: signerEmail, 
            signerName: signerName,
            clientUserId: clientUserId,
            returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}`,
            useFocusedView: useFocusedViewParam
        };
        
        response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "GET_EMBEDDED_SIGNING_URL", payload: recipientViewPayload })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: `Erro HTTP ${response.status}`}));
            throw new Error(errorData.details || errorData.error || `Falha ao obter URL.`);
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

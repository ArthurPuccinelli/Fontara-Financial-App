// frontend/scripts/assinatura-embarcada.js
document.addEventListener('DOMContentLoaded', async function() {
  console.log("assinatura-embarcada.js (vFinal-Rev5 - Revisão Comunicação): Script carregado.");

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
        const errorData = await response.json().catch(() => ({ details: `Erro HTTP ${response.status} ao buscar App Client ID: ${response.statusText}` }));
        throw new Error(errorData.details || `Erro ao buscar App Client ID DocuSign: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.clientId) {
        throw new Error("App Client ID DocuSign (IK) não retornado pela função get-docusign-client-id.");
      }
      console.log("[assinatura-embarcada.js] DOCUSIGN_APP_CLIENT_ID (IK) obtido com sucesso.");
      return data.clientId;
    } catch (error) {
      console.error("[assinatura-embarcada.js] Falha ao obter DOCUSIGN_APP_CLIENT_ID (IK):", error.message);
      // Poderia mostrar um alerta para o usuário aqui se isso for crítico para o funcionamento.
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
        sdkInitializationSuccessful = false;
        return;
      }
      
      DOCUSIGN_APP_CLIENT_ID = await fetchDocusignAppClientId();
      
      if (DOCUSIGN_APP_CLIENT_ID) {
        console.log(`[assinatura-embarcada.js] Chamando window.DocuSign.loadDocuSign com App Client ID (IK): ${DOCUSIGN_APP_CLIENT_ID.substring(0,5)}...`);
        try {
            const loadedInstance = await window.DocuSign.loadDocuSign(DOCUSIGN_APP_CLIENT_ID);
            console.log("[assinatura-embarcada.js] window.DocuSign.loadDocuSign completado. Retorno (loadedInstance):", loadedInstance);
            
            if (loadedInstance && typeof loadedInstance === 'object' && typeof loadedInstance.signing === 'function') {
              docusignApi = loadedInstance;
              sdkInitializationSuccessful = true;
              console.log("[assinatura-embarcada.js] SDK DocuSign (retornado por loadDocuSign) PARECE pronto. Objeto docusignApi:", docusignApi);
              for (const key in docusignApi) {
                if (Object.hasOwnProperty.call(docusignApi, key)) {
                  console.log(`[assinatura-embarcada.js] docusignApi.${key} (tipo: ${typeof docusignApi[key]})`);
                }
              }
            } else {
              console.error("[assinatura-embarcada.js] FALHA CRÍTICA: loadDocuSign não retornou SDK válido ou com método .signing. Retorno:", loadedInstance);
              sdkInitializationSuccessful = false;
            }
        } catch (loadError) {
            console.error("[assinatura-embarcada.js] ERRO CRÍTICO ao chamar window.DocuSign.loadDocuSign:", loadError);
            sdkInitializationSuccessful = false;
        }
      } else {
        console.warn("[assinatura-embarcada.js] IK não obtido. Não é possível inicializar o SDK principal.");
        sdkInitializationSuccessful = false;
      }
    } catch (error) {
      console.error("[assinatura-embarcada.js] Erro EXCEPCIONAL durante a inicialização do SDK DocuSign:", error.message, error.stack);
      sdkInitializationSuccessful = false;
    }

    if (!sdkInitializationSuccessful) {
      console.error("[assinatura-embarcada.js] SDK DocuSign NÃO FOI INICIALIZADO COM SUCESSO. Visualização Focada irá falhar.");
      // Considerar mostrar um alerta para o usuário aqui, pois funcionalidades chave não operarão.
      // alert("Houve um problema ao inicializar o serviço de assinatura. Algumas funcionalidades podem não estar disponíveis.");
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
    const eventType = (docusignEventData.data && docusignEventData.data.type) ? 
                      docusignEventData.data.type : 
                      docusignEventData.event; 
                      
    let finalStatus = eventType;

    if (typeof finalStatus === 'string') {
        const lowerStatus = finalStatus.toLowerCase();
        if (lowerStatus.includes('signing_complete')) finalStatus = 'signing_complete';
        else if (lowerStatus.includes('cancel')) finalStatus = 'cancel';
        else if (lowerStatus.includes('decline')) finalStatus = 'decline';
        else if (lowerStatus.includes('exception')) finalStatus = 'exception';
        else if (lowerStatus.includes('fax_pending')) finalStatus = 'fax_pending';
        else if (lowerStatus.includes('session_timeout')) finalStatus = 'session_timeout';
        else if (lowerStatus.includes('ttl_expired')) finalStatus = 'ttl_expired';
        else if (lowerStatus.includes('viewing_complete')) finalStatus = 'viewing_complete';
    } else {
        console.warn("[handleDocusignCompletionEvents] Status final não é uma string:", finalStatus)
    }

    const envelopeId = (docusignEventData.data && docusignEventData.data.envelopeId) || lastRecipientViewContext.envelopeId;
    const signerName = lastRecipientViewContext.signerName || 'Cliente';

    console.log(`[handleDocusignCompletionEvents] Status Final Normalizado: ${finalStatus}, EnvelopeID: ${envelopeId}`);

    const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerName)}&envelopeId=${envelopeId || ''}`;

    if (finalStatus === 'signing_complete') {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=signing_complete`;
    } else if (['cancel', 'decline', 'exception', 'fax_pending', 'session_timeout', 'ttl_expired', 'viewing_complete'].includes(finalStatus)) {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=${finalStatus}`;
    } else {
        console.warn(`[handleDocusignCompletionEvents] Evento DocuSign não tratado para redirecionamento: ${finalStatus}`);
        // Considerar fechar o modal mesmo para eventos não explicitamente tratados para evitar que fique aberto indefinidamente
        // closeDocusignSigningModal(); 
    }
  }

  function openDocusignSigningModal(url, signingMode) {
    if(docusignModalTitle) docusignModalTitle.textContent = signingMode === 'classic' ? "Assinatura do Documento (Clássica)" : "Assinatura do Documento";

    if (signingMode === 'classic') {
        showElement(docusignIframeContainer, true);
        showElement(docusignFocusedViewContainer, false);
        if(docusignSigningIframe) docusignSigningIframe.src = url;
    } else { // Para 'focused' ou 'clicktoagree'
        showElement(docusignIframeContainer, false);
        showElement(docusignFocusedViewContainer, true);
        if(docusignFocusedViewContainer) docusignFocusedViewContainer.innerHTML = '';

        try {
            if (!sdkInitializationSuccessful || !docusignApi || typeof docusignApi.signing !== 'function') {
                let errorMsg = "SDK DocuSign (docusignApi) não está utilizável. ";
                if (!sdkInitializationSuccessful) errorMsg += "Inicialização falhou. ";
                if (!docusignApi) errorMsg += "docusignApi é nulo/undefined. ";
                else if (typeof docusignApi.signing !== 'function') errorMsg += "docusignApi.signing não é uma função. ";
                
                console.error("[assinatura-embarcada.js]", errorMsg, "Objeto docusignApi:", docusignApi);
                throw new Error(errorMsg);
            }
            
            const signingConfiguration = {
                url: url,
                displayFormat: 'focused', 
                style: { 
                    branding: {
                        primaryButton: { 
                            backgroundColor: '#1665C0', 
                            color: 'white'
                        }
                    },
                    signingNavigationButton: { 
                        finishText: (signingMode === 'clicktoagree' ? 'Aceitar e Concluir' : 'Concluir Assinatura'),
                        position: 'bottom-right' 
                    },
                }
            };
            
            if (signingMode === 'clicktoagree') {
                // Ajustes específicos para C2A podem ser feitos aqui se necessário
            }

            console.log("[assinatura-embarcada.js] Configuração da assinatura (SigningConfiguration):", JSON.stringify(signingConfiguration, null, 2));

            currentSigningInstance = docusignApi.signing(signingConfiguration);
            
            console.log("[assinatura-embarcada.js] Detalhes da currentSigningInstance IMEDIATAMENTE APÓS docusignApi.signing():", currentSigningInstance);
            if (currentSigningInstance) {
                console.log(`[assinatura-embarcada.js] currentSigningInstance.mount é do tipo: ${typeof currentSigningInstance.mount}`);
                console.log(`[assinatura-embarcada.js] currentSigningInstance.on é do tipo: ${typeof currentSigningInstance.on}`);
                console.log(`[assinatura-embarcada.js] currentSigningInstance.off é do tipo: ${typeof currentSigningInstance.off}`);
                console.log(`[assinatura-embarcada.js] currentSigningInstance.destroy é do tipo: ${typeof currentSigningInstance.destroy}`);
            }

            if (!currentSigningInstance || typeof currentSigningInstance.mount !== 'function' || typeof currentSigningInstance.on !== 'function') { 
                console.error("[assinatura-embarcada.js] currentSigningInstance.mount ou .on não são funções ou a instância é inválida:", currentSigningInstance);
                throw new Error("Falha ao criar instância de assinatura DocuSign com métodos mount/on válidos.");
            }
            
            console.log("[assinatura-embarcada.js] Anexando listeners ANTES de .mount()");
            currentSigningInstance.on('ready', (event) => {
                console.log('[DocuSign.js SDK Event] ready:', event);
                const iframeElement = docusignFocusedViewContainer.querySelector('iframe');
                if (iframeElement && docusignModalTitle) {
                    const padding = 40; 
                    const availableHeight = docusignFocusedViewContainer.clientHeight; 
                    iframeElement.style.height = `${availableHeight}px`;
                    console.log(`[assinatura-embarcada.js] Altura do iframe ajustada para: ${availableHeight}px`);
                } else {
                    console.warn("[assinatura-embarcada.js] Não foi possível encontrar o iframe ou docusignModalTitle para ajustar altura.");
                }
            });

            currentSigningInstance.on('sessionEnd', (eventData) => {
                console.log('[DocuSign.js SDK Event] sessionEnd:', eventData);
                handleDocusignCompletionEvents({ 
                    event: 'sessionEnd',
                    data: eventData
                });
            });
            console.log("[assinatura-embarcada.js] Listeners anexados.");

            console.log("[assinatura-embarcada.js] Montando em #docusignFocusedViewContainer...");
            currentSigningInstance.mount('#docusignFocusedViewContainer');
            console.log("[assinatura-embarcada.js] DocuSign Focused View montada (ou tentativa de montagem feita).");

        } catch (error) {
            console.error("[assinatura-embarcada.js] Erro ao montar DocuSign Focused View:", error);
            if (error.message && error.stack) console.error("Detalhe do erro:", error.message, error.stack);
            else if (error.message) console.error("Detalhe do erro (message):", error.message);

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
            } else {
                console.warn("[assinatura-embarcada.js] currentSigningInstance.destroy não é uma função. Não foi possível destruir explicitamente. currentSigningInstance:", currentSigningInstance);
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
    const classicModeSelected = document.querySelector('input[name="signingMode"]:checked')?.value === 'classic';
    if (!classicModeSelected) {
        return;
    }
    if (event.origin !== docusignExpectedOrigin) { 
        return;
    }
    if (typeof event.data === 'string') {
      const params = new URLSearchParams(event.data.startsWith('?') ? event.data.substring(1) : event.data);
      const docusignEventName = params.get('event');
      console.log(`[PostMessage Event - Classic IFRAME] Evento recebido: ${docusignEventName}, Dados: ${event.data}`);
      
      if (docusignEventName) {
          handleDocusignCompletionEvents({ event: docusignEventName, data: { type: docusignEventName } });
      } else {
          console.warn("[PostMessage Event - Classic IFRAME] 'event' não encontrado nos dados da mensagem:", event.data);
      }
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
            console.warn("[assinatura-embarcada.js] SDK não parecia inicializado no submit, tentando novamente...");
            await initializeDocuSignSdk();
        }
        
        const currentSigningMode = document.querySelector('input[name="signingMode"]:checked').value;
        if (currentSigningMode !== 'classic' && !sdkInitializationSuccessful) {
             console.error("[assinatura-embarcada.js] Tentativa de assinatura focada/C2A sem SDK inicializado com sucesso.");
             throw new Error("Falha crítica na inicialização do SDK DocuSign. Não é possível prosseguir com esta modalidade de assinatura.");
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
        lastRecipientViewContext = { envelopeId: null, signerName: signerName }; 

        const envelopePayload = {
            emailSubject: emailSubjectVal,
            documents: [{ name: documentName, fileExtension: documentFileExtension, documentId: String(currentDocumentId), documentBase64: documentBase64 }],
            recipients: { signers: [{ email: signerEmail, name: signerName, recipientId: "1", clientUserId: clientUserId, routingOrder: "1", tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] } }] },
            status: "sent"
        };
        
        console.log("[assinatura-embarcada.js] Enviando para CREATE_DYNAMIC_ENVELOPE...");
        let response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "CREATE_DYNAMIC_ENVELOPE", payload: envelopePayload })
        });

        let responseData;
        if (!response.ok) {
            let errorDetails = `Erro HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = await response.json();
                errorDetails = errorJson.details || errorJson.error || errorDetails;
            } catch (e) { /* Ignora erro de parse se o corpo não for JSON */ }
            console.error(`[assinatura-embarcada.js] Erro ao chamar CREATE_DYNAMIC_ENVELOPE: ${errorDetails}`);
            throw new Error(`Falha ao criar envelope: ${errorDetails}`);
        }
        responseData = await response.json();
        
        const envelopeId = responseData.envelopeId;
        if (!envelopeId) {
          console.error("[assinatura-embarcada.js] ID do envelope não retornado pela API após CREATE_DYNAMIC_ENVELOPE. Resposta:", responseData);
          throw new Error("ID do envelope não retornado pela API.");
        }
        
        console.log(`[assinatura-embarcada.js] Envelope ID: ${envelopeId}`);
        lastRecipientViewContext.envelopeId = envelopeId; 

        let useFocusedViewParam = (currentSigningMode === 'focused' || currentSigningMode === 'clicktoagree');
        
        const recipientViewPayload = {
            envelopeId: envelopeId, 
            signerEmail: signerEmail, 
            signerName: signerName,
            clientUserId: clientUserId,
            returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}&source=recipientViewReturnUrl`,
            useFocusedView: useFocusedViewParam
        };
        
        console.log("[assinatura-embarcada.js] Enviando para GET_EMBEDDED_SIGNING_URL com payload:", recipientViewPayload);
        response = await fetch('/.netlify/functions/docusign-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "GET_EMBEDDED_SIGNING_URL", payload: recipientViewPayload })
        });

        if (!response.ok) {
            let errorDetails = `Erro HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = await response.json();
                errorDetails = errorJson.details || errorJson.error || errorDetails;
            } catch (e) { /* Ignora erro de parse se o corpo não for JSON */ }
            console.error(`[assinatura-embarcada.js] Erro ao chamar GET_EMBEDDED_SIGNING_URL: ${errorDetails}`);
            throw new Error(`Erro ao gerar URL de assinatura. Detalhe: ${errorDetails}`);
        }
        responseData = await response.json();

        const signingUrl = responseData.signingUrl; 
        console.log(`[assinatura-embarcada.js] URL de assinatura recebida: ${signingUrl ? signingUrl.substring(0, 100) + "..." : "NULA"}`);

        if (signingUrl) {
          openDocusignSigningModal(signingUrl, currentSigningMode);
        } else {
          console.error("[assinatura-embarcada.js] URL de assinatura não retornada pela API após GET_EMBEDDED_SIGNING_URL. Resposta:", responseData);
          throw new Error("URL de assinatura não retornada pela API.");
        }

      } catch (error) {
          console.error("[assinatura-embarcada.js] Erro no processo Docusign (submit):", error.message, error.stack ? error.stack : '');
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

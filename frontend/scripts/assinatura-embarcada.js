document.addEventListener('DOMContentLoaded', function() {
  console.log("assinatura-embarcada.js (v2): Script carregado.");

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
  
  // ATENÇÃO: Ajuste esta URL para o ambiente correto do Docusign
  const docusignExpectedOrigin = "https://demo.docusign.net"; 
  let originalHeaderZIndex = ''; // Para gerenciar z-index do header

  // --- FUNÇÕES AUXILIARES ---

  function showElement(element, show) {
    if (element) {
      element.classList.toggle('tw-hidden', !show);
    }
  }

  function updateDocumentFieldsVisibility() {
    const signingMode = document.querySelector('input[name="signingMode"]:checked')?.value;

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

  function openDocusignSigningModal(url) {
    if (docusignIframe && docusignModalOverlay) {
      docusignIframe.src = url;
      docusignModalOverlay.classList.remove('tw-hidden');
      document.body.style.overflow = 'hidden';
      const headerActual = document.querySelector('#header-placeholder header');
      if (headerActual) {
        originalHeaderZIndex = headerActual.style.zIndex; 
        headerActual.style.zIndex = '10'; 
      }
    }
  }

  function closeDocusignSigningModal() {
    if (docusignIframe && docusignModalOverlay) {
      docusignIframe.src = 'about:blank';
      docusignModalOverlay.classList.add('tw-hidden');
      document.body.style.overflow = '';
      const headerActual = document.querySelector('#header-placeholder header');
      if (headerActual) {
        headerActual.style.zIndex = originalHeaderZIndex || ''; 
      }
    }
  }

  // --- EVENT LISTENERS ---

  document.querySelectorAll('input[name="signingMode"]').forEach(radio => {
    radio.addEventListener('change', updateDocumentFieldsVisibility);
  });

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
  
  if (closeDocusignSigningModalBtn) {
    closeDocusignSigningModalBtn.addEventListener('click', closeDocusignSigningModal);
  }
  if (docusignModalOverlay) {
      docusignModalOverlay.addEventListener('click', function(event) {
          if (event.target === docusignModalOverlay) {
              closeDocusignSigningModal();
          }
      });
  }

  window.addEventListener('message', function(event) {
    if (event.origin !== docusignExpectedOrigin) {
      return;
    }
    if (typeof event.data === 'string') {
      const params = new URLSearchParams(event.data.startsWith('?') ? event.data.substring(1) : event.data);
      const docusignEvent = params.get('event');
      const envelopeIdFromEvent = params.get('envelopeId'); 
      console.log(`[Assinatura Embarcada] Evento Docusign recebido: ${docusignEvent}, EnvelopeID: ${envelopeIdFromEvent || 'N/A'}`);

      const signerNameFromForm = signerNameInput ? signerNameInput.value : 'Cliente';
      const returnUrlBase = `${window.location.origin}/agradecimento/obrigado.html?recipientName=${encodeURIComponent(signerNameFromForm)}&envelopeId=${envelopeIdFromEvent || ''}`;

      if (docusignEvent === 'signing_complete') {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=signing_complete`;
      } else if (['decline', 'cancel', 'session_timeout', 'ttl_expired', 'exception', 'viewing_complete'].includes(docusignEvent)) {
        closeDocusignSigningModal();
        window.location.href = `${returnUrlBase}&event=${docusignEvent}`;
      }
    }
  }, false);

  if (envelopeForm) {
    envelopeForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      const originalButtonInnerHTML = submitEnvelopeBtn.innerHTML; // Salva o HTML interno original
      
      if (submitEnvelopeBtn && submitBtnTextSpan) {
        submitEnvelopeBtn.disabled = true;
        // Mantém o ícone e muda o texto para "Processando..."
        submitBtnTextSpan.innerHTML = '<div class="spinner-small" role="status" aria-hidden="true"></div> Processando...';
      }

      try {
        const signerName = signerNameInput.value;
        const signerEmail = signerEmailInput.value;
        const emailSubjectVal = emailSubjectInput.value; // Renomeado para evitar conflito
        
        const signingMode = document.querySelector('input[name="signingMode"]:checked').value;
        const documentChoice = (signingMode !== 'clicktoagree' && docDefaultRadio) ? 
                               document.querySelector('input[name="documentChoice"]:checked').value : 
                               'default';

        let documentBase64 = '';
        let documentName = '';
        let currentDocumentId = DEFAULT_DOC_ID;
        const documentFileExtension = 'pdf'; 

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
          currentDocumentId = UPLOADED_DOC_ID_PREFIX + Date.now();
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
        
        const clientUserId = `fontara_${signerEmail.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`; 

        const envelopePayload = {
          emailSubject: emailSubjectVal, // Usando a variável renomeada
          documents: [{ 
            name: documentName, 
            fileExtension: documentFileExtension, 
            documentId: String(currentDocumentId),
            documentBase64: documentBase64 
          }],
          recipients: {
            signers: [{
              email: signerEmail, name: signerName, recipientId: "1", 
              clientUserId: clientUserId, routingOrder: "1",
              tabs: { signHereTabs: [{ anchorString: "\\s1\\", anchorXOffset: "0", anchorYOffset: "0", anchorUnits: "pixels" }] }
            }]
          },
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
        
        // CORREÇÃO PRINCIPAL: Define useFocusedView explicitamente
        let useFocusedViewParam = false; // Padrão para 'classic'
        if (signingMode === 'focused' || signingMode === 'clicktoagree') {
            useFocusedViewParam = true;
        }
        
        const recipientViewPayload = {
          envelopeId: envelopeId, 
          signerEmail: signerEmail, 
          signerName: signerName,
          clientUserId: clientUserId,
          returnUrl: `${window.location.origin}/agradecimento/obrigado.html?event=FALLBACK_REDIRECT&envelopeId=${envelopeId}&recipientName=${encodeURIComponent(signerName)}`,
          useFocusedView: useFocusedViewParam // Passa o parâmetro CORRETO
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
          openDocusignSigningModal(signingUrl);
        } else {
          throw new Error("URL de assinatura não retornada pela API.");
        }

      } catch (error) {
        console.error("[assinatura-embarcada.js] Erro no processo Docusign:", error.message, error.stack);
        alert(`Ocorreu um erro: ${error.message}`);
      } finally {
        if(submitEnvelopeBtn) {
            submitEnvelopeBtn.disabled = false;
            // Restaura o HTML interno original do botão, que inclui o ícone e o texto
            submitEnvelopeBtn.innerHTML = originalButtonInnerHTML;
        }
      }
    });
  }

  // --- INICIALIZAÇÃO ---
  updateDocumentFieldsVisibility();

});

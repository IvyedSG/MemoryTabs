/* global chrome */
console.log('Memory Tabs content script loaded')

let recording = false
let events = []

// Verificamos el estado al cargar
checkRecordingState()

// Creamos un indicador visual para mostrar cuando estamos grabando
createRecordingIndicator()

function checkRecordingState() {
  chrome.runtime.sendMessage({ action: 'getRecordingState' }, (response) => {
    console.log('Content script recibió estado:', response)
    if (response && response.isRecording) {
      console.log('Restaurando grabación en progreso')
      startRecording(false) // No reiniciar eventos si ya estaba grabando
    }
  })
}

function createRecordingIndicator() {
  // Eliminar el indicador si ya existe
  const existingIndicator = document.getElementById('memory-tabs-indicator')
  if (existingIndicator) {
    existingIndicator.remove()
  }

  const indicator = document.createElement('div')
  indicator.id = 'memory-tabs-indicator'
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 12px;
    height: 12px;
    background-color: #ef4444;
    border-radius: 50%;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
  `
  document.body.appendChild(indicator)
}

function showRecordingIndicator() {
  const indicator = document.getElementById('memory-tabs-indicator')
  if (indicator) {
    indicator.style.opacity = '1'
    // Añadimos animación de pulso
    indicator.style.animation = 'memory-tabs-pulse 2s infinite'

    // Añadir animación si no existe
    if (!document.getElementById('memory-tabs-style')) {
      const style = document.createElement('style')
      style.id = 'memory-tabs-style'
      style.textContent = `
        @keyframes memory-tabs-pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); }
        }
      `
      document.head.appendChild(style)
    }
  }
}

function hideRecordingIndicator() {
  const indicator = document.getElementById('memory-tabs-indicator')
  if (indicator) {
    indicator.style.opacity = '0'
    indicator.style.animation = 'none'
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script recibió mensaje:', message)

  if (message.action === 'startRecording') {
    startRecording(true) // Reiniciar eventos
    sendResponse({ status: 'Recording started' })
  }

  if (message.action === 'stopRecording') {
    stopRecording()
    sendResponse({ status: 'Recording stopped', events })
  }

  if (message.action === 'getEvents') {
    sendResponse({ events })
  }

  // Return true to indicate async response
  return true
})

function startRecording(resetEvents = true) {
  console.log('Recording started, reset events:', resetEvents)
  recording = true

  if (resetEvents) {
    events = []
  }

  // Mostrar indicador de grabación
  showRecordingIndicator()

  // Notify background script
  chrome.runtime.sendMessage({ action: 'recordingStarted' }, (response) => {
    console.log('Respuesta al iniciar grabación:', response)
  })

  // Start listening for events - remove existing listeners first
  document.removeEventListener('click', recordClick, true)
  document.removeEventListener('input', recordInput, true)
  document.removeEventListener('change', recordChange, true)
  document.removeEventListener('submit', recordSubmit, true)

  document.addEventListener('click', recordClick, true)
  document.addEventListener('input', recordInput, true)
  document.addEventListener('change', recordChange, true)
  document.addEventListener('submit', recordSubmit, true)
}

function stopRecording() {
  console.log('Recording stopped, events captured:', events.length)
  recording = false

  // Ocultar indicador de grabación
  hideRecordingIndicator()

  // Stop listening for events
  document.removeEventListener('click', recordClick, true)
  document.removeEventListener('input', recordInput, true)
  document.removeEventListener('change', recordChange, true)
  document.removeEventListener('submit', recordSubmit, true)

  // Notify background script
  chrome.runtime.sendMessage(
    {
      action: 'recordingStopped',
      data: events,
    },
    (response) => {
      console.log('Respuesta al detener grabación:', response)
    },
  )
}

function recordClick(e) {
  if (!recording) return

  // Get element information
  const element = e.target
  const elementInfo = getElementInfo(element)

  if (!elementInfo) return

  events.push({
    type: 'click',
    selector: elementInfo.selector,
    elementType: elementInfo.type,
    elementId: elementInfo.id,
    elementName: elementInfo.name,
    isButton:
      element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && element.type === 'submit'),
    timestamp: Date.now(),
  })

  console.log('Recorded click:', elementInfo.selector)
}

function recordInput(e) {
  if (!recording) return

  // Get element information
  const element = e.target
  const elementInfo = getElementInfo(element)

  if (!elementInfo) return

  // Only record for input elements
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    events.push({
      type: 'input',
      selector: elementInfo.selector,
      elementType: elementInfo.type,
      elementId: elementInfo.id,
      elementName: elementInfo.name,
      value: element.value,
      inputType: element.type || 'text',
      timestamp: Date.now(),
    })

    console.log('Recorded input:', elementInfo.selector, element.value)
  }
}

function recordChange(e) {
  if (!recording) return

  // Get element information
  const element = e.target
  const elementInfo = getElementInfo(element)

  if (!elementInfo) return

  // For select dropdowns
  if (element.tagName === 'SELECT') {
    const selectedOption = element.options[element.selectedIndex]

    events.push({
      type: 'select',
      selector: elementInfo.selector,
      elementType: elementInfo.type,
      elementId: elementInfo.id,
      elementName: elementInfo.name,
      value: element.value,
      optionText: selectedOption ? selectedOption.text : '',
      optionIndex: element.selectedIndex,
      timestamp: Date.now(),
    })

    console.log('Recorded select:', elementInfo.selector, element.value)
  }

  // For checkboxes and radios
  if (element.tagName === 'INPUT' && (element.type === 'checkbox' || element.type === 'radio')) {
    events.push({
      type: element.type,
      selector: elementInfo.selector,
      elementType: elementInfo.type,
      elementId: elementInfo.id,
      elementName: elementInfo.name,
      checked: element.checked,
      value: element.value,
      timestamp: Date.now(),
    })

    console.log(`Recorded ${element.type}:`, elementInfo.selector, element.checked)
  }
}

function recordSubmit(e) {
  if (!recording) return

  // Get element information
  const element = e.target
  const elementInfo = getElementInfo(element)

  if (!elementInfo) return

  events.push({
    type: 'submit',
    selector: elementInfo.selector,
    formId: element.id,
    timestamp: Date.now(),
  })

  console.log('Recorded form submit:', elementInfo.selector)
}

function getElementInfo(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return null

  return {
    selector: getBestSelector(element),
    type: element.tagName.toLowerCase(),
    id: element.id || '',
    name: element.name || '',
  }
}

function getBestSelector(element) {
  // Try to get the simplest effective selector
  if (element.id) {
    return `#${element.id}`
  }

  if (element.name) {
    const nameSelector = `[name="${element.name}"]`
    // Check if this selector is unique
    if (document.querySelectorAll(nameSelector).length === 1) {
      return nameSelector
    }
  }

  // Fallback to full path if needed
  return getElementPath(element)
}

function getElementPath(element) {
  // Full path as fallback
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return ''

  let path = []
  while (element && element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase()

    if (element.id) {
      selector += '#' + element.id
      path.unshift(selector)
      break
    } else {
      let siblings = element.parentNode ? [...element.parentNode.children] : []
      if (siblings.length > 1) {
        let index = siblings.indexOf(element) + 1
        if (index > 1) selector += `:nth-child(${index})`
      }
      path.unshift(selector)
      element = element.parentNode
    }
  }

  return path.join(' > ')
}

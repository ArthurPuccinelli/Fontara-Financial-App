document.addEventListener('DOMContentLoaded', function() {
  console.log('Custom Effects: DOMContentLoaded for text generation effect.');
  const textElement = document.getElementById('financial-text-effect');

  if (textElement) {
    console.log('Custom Effects: Element #financial-text-effect found for generation.');
    const originalText = textElement.textContent.trim(); // Get and trim original text
    textElement.innerHTML = ''; // Clear the original content

    const letters = originalText.split('');
    let delay = 0;

    letters.forEach((char, index) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      // Use non-breaking space for actual spaces to maintain them
      letterSpan.innerHTML = (char === ' ') ? '&nbsp;' : char;
      textElement.appendChild(letterSpan);

      setTimeout(() => {
        letterSpan.classList.add('visible');
      }, delay);

      delay += 75; // Adjust this value to change the speed of the effect (milliseconds)
    });
    console.log('Custom Effects: Text generation setup complete. Animation should start.');
  } else {
    console.error("Custom Effects: Element with ID 'financial-text-effect' not found for generation.");
  }
});

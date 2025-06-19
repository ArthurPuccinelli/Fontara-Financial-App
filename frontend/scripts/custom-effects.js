document.addEventListener('DOMContentLoaded', function() {
  console.log('Custom Effects: DOMContentLoaded event fired.');
  const textElement = document.getElementById('financial-text-effect');

  if (textElement) {
    console.log('Custom Effects: Element #financial-text-effect found:', textElement);
    window.addEventListener('scroll', function() {
      const scrollPosition = window.scrollY;
      const elementPosition = textElement.offsetTop;
      console.log('Custom Effects: Scroll event. ScrollY:', scrollPosition, 'Element OffsetTop:', elementPosition); // Uncommented
      console.log('Custom Effects: scrollY:', scrollPosition, 'calc threshold:', elementPosition - window.innerHeight / 2, 'element.offsetTop:', elementPosition, 'window.innerHeight:', window.innerHeight); // Added

      if (scrollPosition > elementPosition - window.innerHeight / 2) {
        if (!textElement.classList.contains('active-effect')) {
          console.log('Custom Effects: Adding active-effect class.');
          textElement.classList.add('active-effect');
        }
      } else {
        if (textElement.classList.contains('active-effect')) {
          console.log('Custom Effects: Removing active-effect class.');
          textElement.classList.remove('active-effect');
        }
      }
    });
  } else {
    console.error("Custom Effects: Element with ID 'financial-text-effect' not found.");
  }
});

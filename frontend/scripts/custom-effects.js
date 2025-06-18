document.addEventListener('DOMContentLoaded', function() {
  const textElement = document.getElementById('financial-text-effect');

  if (textElement) {
    window.addEventListener('scroll', function() {
      const scrollPosition = window.scrollY;
      const elementPosition = textElement.offsetTop;

      // Add or remove the 'active-effect' class based on scroll position
      // You can adjust the scroll threshold as needed
      if (scrollPosition > elementPosition - window.innerHeight / 2) {
        textElement.classList.add('active-effect');
      } else {
        textElement.classList.remove('active-effect');
      }
    });
  } else {
    console.error("Element with ID 'financial-text-effect' not found.");
  }
});

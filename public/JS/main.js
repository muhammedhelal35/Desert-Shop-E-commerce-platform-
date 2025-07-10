
document.addEventListener('DOMContentLoaded', function () {
  s
  const navToggle = document.querySelector('.navbar-toggle');
  const navLinks = document.querySelector('.navbar-links');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('open');
      
      if (isOpen) {
        navLinks.classList.remove('open');
      } else {
        navLinks.classList.add('open');
      }
    });
  }


  const fadeEls = document.querySelectorAll('.fade-in');
  fadeEls.forEach(el => {
    el.classList.add('visible');
  });

  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const targetPosition = target.offsetTop - 100;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'auto'
        });
      }
    });
  });


  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
  
  
  const cartCountEl = document.querySelector('.navbar-cart');
  if (cartCountEl && sessionStorage.getItem('cartCount')) {
    const match = cartCountEl.innerHTML.match(/Cart \((\d+)\)/);
    if (match && match[1] !== sessionStorage.getItem('cartCount')) {
      cartCountEl.innerHTML = cartCountEl.innerHTML.replace(/Cart \((\d+)\)/, 'Cart (' + sessionStorage.getItem('cartCount') + ')');
    }
  }

  
  const adminToggle = document.querySelector('.admin-navbar-toggle');
  const adminLinks = document.getElementById('admin-navbar-links');
  if (adminToggle && adminLinks) {
    adminToggle.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      adminLinks.classList.toggle('open');
    });
  }

  
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.style.opacity = '1';
    img.style.transform = 'none';
  });

  
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement?.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement?.classList.remove('focused');
    });
  });


  document.querySelectorAll('.btn-main, .btn-secondary, .navbar-cart, .action-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  
  const style = document.createElement('style');
  style.textContent = `
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
    }
    
    @keyframes ripple-animation {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});

window.addEventListener('error', function(e) {
  console.warn('UI Enhancement Error:', e.error);
});


let scrollTimeout;
window.addEventListener('scroll', function() {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(function() {
  
  }, 16);
}); 
/**
 * MongoDB Backup Manager Documentation
 * Premium Interactive JavaScript
 */

// ============= DOM Elements =============
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const methodBtns = document.querySelectorAll('.method-btn');
const stepsContainers = document.querySelectorAll('.steps-container');
const showcaseTabs = document.querySelectorAll('.showcase-tab');

// ============= Navigation =============
// Scroll effect for navbar
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile navigation toggle
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (navToggle) navToggle.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (navbar && !navbar.contains(e.target) && navMenu?.classList.contains('active')) {
        navToggle?.classList.remove('active');
        navMenu?.classList.remove('active');
    }
});

// ============= Install Method Tabs =============
methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        
        // Update button states
        methodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update steps visibility
        stepsContainers.forEach(container => {
            container.classList.remove('active');
            if (container.id === `${method}-steps`) {
                container.classList.add('active');
            }
        });
    });
});

// ============= Preview Showcase Tabs =============
showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const preview = tab.dataset.preview;
        console.log('Tab clicked:', preview);
        
        // Update tab states
        showcaseTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update which image is shown - use specific container selector
        const container = document.getElementById('previewImage');
        if (container) {
            const images = container.querySelectorAll('.showcase-image');
            console.log('Found images:', images.length);
            images.forEach(img => {
                img.classList.remove('active');
                console.log('Checking image:', img.dataset.tab, 'against:', preview);
                if (img.dataset.tab === preview) {
                    img.classList.add('active');
                    console.log('Activated:', img.dataset.tab);
                }
            });
        }
    });
});

// ============= Copy Code Functionality =============
function copyCode(button) {
    const codeBlock = button.parentElement.querySelector('code');
    const code = codeBlock.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        // Visual feedback
        button.classList.add('copied');
        
        // Change icon temporarily
        const originalSvg = button.innerHTML;
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
        
        // Reset after delay
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalSvg;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
    });
}

// Make copyCode available globally
window.copyCode = copyCode;

// ============= Smooth Scroll for Anchor Links =============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ============= Intersection Observer for Animations =============
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            animateOnScroll.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe animatable elements
document.querySelectorAll('.feature-card, .api-card, .step').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${index * 0.05}s, transform 0.5s ease ${index * 0.05}s`;
    animateOnScroll.observe(el);
});

// ============= Active Navigation Highlight =============
const sections = document.querySelectorAll('section[id]');

function highlightNavOnScroll() {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 120;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        
        if (navLink) {
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.style.color = '';
                });
                navLink.style.color = 'var(--primary-light)';
            }
        }
    });
}

// Throttle scroll event
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            highlightNavOnScroll();
            ticking = false;
        });
        ticking = true;
    }
});

// ============= Keyboard Navigation =============
document.addEventListener('keydown', (e) => {
    // Escape to close mobile menu
    if (e.key === 'Escape' && navMenu?.classList.contains('active')) {
        navToggle?.classList.remove('active');
        navMenu?.classList.remove('active');
    }
});

// ============= Image Loading Helper =============
// This function can be used to load images into the preview placeholders
function setPreviewImage(containerId, imagePath) {
    const container = document.getElementById(containerId);
    if (container) {
        const placeholder = container.querySelector('.preview-placeholder');
        if (placeholder) {
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = 'Dashboard Preview';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.borderRadius = '8px';
            
            img.onload = () => {
                placeholder.replaceWith(img);
            };
            
            img.onerror = () => {
                console.error('Failed to load image:', imagePath);
            };
        }
    }
}

// Export for external use
window.setPreviewImage = setPreviewImage;

// ============= Initialize =============
document.addEventListener('DOMContentLoaded', () => {
    // Add loaded class to body
    document.body.classList.add('loaded');
    
    // Initialize first method tab as active
    const firstMethodBtn = document.querySelector('.method-btn');
    const firstSteps = document.getElementById('docker-steps');
    if (firstMethodBtn && !document.querySelector('.method-btn.active')) {
        firstMethodBtn.classList.add('active');
    }
    if (firstSteps && !document.querySelector('.steps-container.active')) {
        firstSteps.classList.add('active');
    }
    
    // Initialize first showcase tab as active
    const firstShowcaseTab = document.querySelector('.showcase-tab');
    if (firstShowcaseTab && !document.querySelector('.showcase-tab.active')) {
        firstShowcaseTab.classList.add('active');
    }
    
    console.log('🗄️ MongoDB Backup Manager Docs loaded!');
});

// ============= Performance: Lazy Loading for Images =============
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  let allProducts = [];
  let cart = [];
  let csrfToken = '';

  // Elementos del DOM
  const productsGrid = document.getElementById('products-grid');
  const filterBtns = document.querySelectorAll('#category-filters button');
  const ofertaModal = document.getElementById('oferta-modal');
  const ofertaContent = document.getElementById('oferta-content');
  const closeOferta = document.getElementById('close-oferta');
  const btnOfertaAdd = document.getElementById('btn-oferta-add');

  // Elementos de Autenticación
  const authModal = document.getElementById('auth-modal');
  const authContent = document.getElementById('auth-content');
  const closeAuth = document.getElementById('close-auth');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authSwitchBtn = document.getElementById('btn-auth-switch');
  const authSwitchText = document.getElementById('auth-switch-text');
  const fieldNombre = document.getElementById('field-nombre');
  const authNombreInput = document.getElementById('auth-nombre');
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const authError = document.getElementById('auth-error');
  const authNavContainer = document.getElementById('auth-nav-container');

  // Elementos del Carrito
  const btnCartTrigger = document.getElementById('btn-cart-trigger');
  const cartModal = document.getElementById('cart-modal');
  const cartContent = document.getElementById('cart-content');
  const closeCart = document.getElementById('close-cart');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartTotal = document.getElementById('cart-total');
  const cartBadge = document.getElementById('cart-badge');
  const orderForm = document.getElementById('order-form');
  const orderPickupDate = document.getElementById('order-pickup-date');
  const orderError = document.getElementById('order-error');
  const orderSuccessMsg = document.getElementById('order-success-msg');

  // Elementos de Mis Pedidos
  const ordersModal = document.getElementById('orders-modal');
  const ordersContent = document.getElementById('orders-content');
  const closeOrders = document.getElementById('close-orders');
  const ordersListContainer = document.getElementById('orders-list-container');

  // Elementos de Detalle de Producto
  const detalleModal = document.getElementById('detalle-modal');
  const detalleContent = document.getElementById('detalle-content');
  const closeDetalle = document.getElementById('close-detalle');
  const btnDetalleAdd = document.getElementById('btn-detalle-add');

  // Catálogo PDF
  const btnDownloadCatalog = document.getElementById('btn-download-catalog');

  let isRegisterMode = false;
  let currentUser = null;
  let currentOfertaProduct = null;
  let currentDetailProduct = null;

  // Utilidad para formatear precio a $xxx.xxx
  function formatPrecio(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') {
      value = Math.round(value);
    }
    let rawValue = String(value).replace(/\D/g, '');
    if (!rawValue) return '';
    return '$' + rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // --- AYUDANTE DE CREACIÓN DE ELEMENTOS SEGURO (PREVENCIÓN XSS) ---
  function el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className' || key === 'class') {
        element.className = val;
      } else if (key === 'textContent' || key === 'text') {
        element.textContent = val;
      } else if (key === 'style') {
        element.style.cssText = val;
      } else if (key.startsWith('on') && typeof val === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (val !== null && val !== undefined) {
        element.setAttribute(key, val);
      }
    }
    children.forEach(child => {
      if (child) {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      }
    });
    return element;
  }

  // Inicializar aplicación
  initApp();

  async function initApp() {
    await fetchCSRFToken();
    await checkSession();
    await fetchProducts();
    await checkOfertaDelDia();
    await checkCatalog();
    setupFilters();
    setupAuthListeners();
    setupCartListeners();
    setupOrdersListeners();
    setupDetalleListeners();
    cargarCarritoDesdeStorage();
  }

  // Obtener Token CSRF
  async function fetchCSRFToken() {
    try {
      const res = await fetch('/api/csrf-token');
      const data = await res.json();
      csrfToken = data.csrfToken;
    } catch (err) {
      console.error('Error al obtener token CSRF:', err);
    }
  }

  // Verificar la sesión usando cookies (HTTP-Only)
  async function checkSession() {
    try {
      const res = await fetch('/api/usuario');
      if (res.ok) {
        currentUser = await res.json();
        updateNavbar(currentUser);
      } else {
        currentUser = null;
        updateNavbar(null);
      }
    } catch (err) {
      console.error('Error verificando sesión:', err);
      currentUser = null;
      updateNavbar(null);
    }
  }

  // Actualizar Navbar de Forma Segura sin innerHTML
  function updateNavbar(user) {
    // Limpiar contenedor de forma segura
    authNavContainer.replaceChildren();

    if (user) {
      if (user.rol === 'admin') {
        authNavContainer.appendChild(
          el('div', { class: 'flex items-center gap-4' }, [
            el('span', { class: 'text-sm font-medium text-gray-700' }, [
              "¡Hola, ",
              el('strong', { class: 'text-dulce-cyan font-bold', text: 'Admin' }),
              "! 👑"
            ]),
            el('a', { 
              href: '/admin.html', 
              class: 'text-xs bg-dulce-cyan/10 hover:bg-dulce-cyan text-dulce-cyan hover:text-white font-semibold py-1.5 px-3 rounded-full transition duration-300',
              text: 'Panel Admin'
            }),
            el('button', { 
              id: 'btn-logout', 
              class: 'text-xs font-semibold text-gray-500 hover:text-dulce-coral transition duration-300',
              text: 'Cerrar Sesión',
              onClick: ejecutarLogout
            })
          ])
        );
      } else {
        authNavContainer.appendChild(
          el('div', { class: 'flex items-center gap-4' }, [
            el('span', { class: 'text-sm font-medium text-gray-700' }, [
              "¡Hola, ",
              el('strong', { class: 'text-dulce-pink font-bold', text: user.nombre }),
              "! 🍬 "
            ]),
            el('span', { 
              class: 'bg-pink-100 text-dulce-pink text-xs font-bold px-2 py-1 rounded-full',
              text: `${user.puntos} pts`
            }),
            el('button', {
              class: 'text-xs bg-dulce-pink/10 hover:bg-dulce-pink text-dulce-pink hover:text-white font-semibold py-1.5 px-3 rounded-full transition duration-300',
              text: 'Mis Pedidos',
              onClick: abrirOrdersModal
            }),
            el('button', { 
              id: 'btn-logout', 
              class: 'text-xs font-semibold text-gray-500 hover:text-dulce-coral transition duration-300',
              text: 'Cerrar Sesión',
              onClick: ejecutarLogout
            })
          ])
        );
      }
    } else {
      authNavContainer.appendChild(
        el('button', { 
          id: 'btn-login-trigger', 
          class: 'bg-white/80 hover:bg-dulce-pink hover:text-white text-gray-700 font-semibold py-1.5 px-4 rounded-full border border-pink-200/60 shadow-sm transition-all duration-300 text-sm hover:scale-105',
          text: 'Acceso Cliente / Dueño',
          onClick: abrirAuthModal
        })
      );
    }
  }

  // Cerrar Sesión llamando a la API
  async function ejecutarLogout() {
    try {
      await fetch('/api/logout', { 
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken }
      });
      currentUser = null;
      // Recargar CSRF y sesión para limpiar estado
      await fetchCSRFToken();
      await checkSession();
      // Opcionalmente recargar historial/carrito
      cart = [];
      guardarCarritoEnStorage();
      renderCarrito();
      // Recargar para limpiar todo rastro
      window.location.reload();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }

  // --- AUTENTICACIÓN MODAL ---
  function abrirAuthModal() {
    isRegisterMode = false;
    actualizarAuthModalMode();
    authError.classList.add('hidden');
    authForm.reset();
    
    authModal.classList.remove('hidden');
    setTimeout(() => {
      authModal.classList.remove('opacity-0');
      authContent.classList.remove('scale-95');
      authContent.classList.add('scale-100');
    }, 50);
  }

  function cerrarAuthModal() {
    authModal.classList.add('opacity-0');
    authContent.classList.remove('scale-100');
    authContent.classList.add('scale-95');
    
    setTimeout(() => {
      authModal.classList.add('hidden');
    }, 300);
  }

  function actualizarAuthModalMode() {
    if (isRegisterMode) {
      authTitle.textContent = 'Crear Cuenta';
      authSubmitBtn.textContent = 'Registrarse';
      authSwitchText.textContent = '¿Ya tienes una cuenta?';
      authSwitchBtn.textContent = 'Inicia Sesión';
      fieldNombre.classList.remove('hidden');
      authNombreInput.required = true;
    } else {
      authTitle.textContent = 'Iniciar Sesión';
      authSubmitBtn.textContent = 'Ingresar';
      authSwitchText.textContent = '¿No tienes una cuenta?';
      authSwitchBtn.textContent = 'Regístrate';
      fieldNombre.classList.add('hidden');
      authNombreInput.required = false;
    }
  }

  function setupAuthListeners() {
    closeAuth.addEventListener('click', cerrarAuthModal);
    
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        cerrarAuthModal();
      }
    });

    authSwitchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      actualizarAuthModalMode();
      authError.classList.add('hidden');
    });

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authError.classList.add('hidden');

      const email = authEmailInput.value;
      const password = authPasswordInput.value;

      const url = isRegisterMode ? '/api/register' : '/api/login';
      const payload = isRegisterMode 
        ? { nombre: authNombreInput.value, email, password }
        : { email, password };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
          cerrarAuthModal();
          await checkSession();
          if (data.rol === 'admin') {
            window.location.href = '/admin.html';
          }
        } else {
          authError.textContent = data.error || 'Ocurrió un error.';
          authError.classList.remove('hidden');
        }
      } catch (err) {
        authError.textContent = 'Error de conexión con el servidor.';
        authError.classList.remove('hidden');
      }
    });
  }

  // --- OBTENER PRODUCTOS ---
  async function fetchProducts() {
    try {
      const res = await fetch('/api/productos');
      allProducts = await res.json();
      renderProducts(allProducts);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }

  // Renderizado seguro de productos sin innerHTML
  function renderProducts(products) {
    productsGrid.replaceChildren();
    
    if (products.length === 0) {
      productsGrid.appendChild(
        el('p', { 
          class: 'text-center col-span-full text-gray-500 font-medium py-12',
          text: 'No hay productos disponibles por ahora.' 
        })
      );
      return;
    }

    products.forEach((p, index) => {
      const delay = index * 0.05;
      
      const imgEl = el('img', {
        class: 'w-full h-full object-contain transition-transform duration-500 group-hover:scale-105',
        src: p.imagen_path || 'https://via.placeholder.com/400x400?text=Dulcería',
        alt: p.nombre
      });
      
      const card = el('div', {
        class: 'glass-card overflow-hidden group fade-up flex flex-col cursor-pointer',
        style: `animation-delay: ${delay}s`,
        onClick: (e) => {
          if (e.target.closest('button')) return;
          abrirDetalleModal(p);
        }
      }, [
        // Contenedor cuadrado: muestra la imagen completa sin recortar
        el('div', { class: 'relative w-full aspect-square overflow-hidden bg-pink-50/60 flex items-center justify-center p-4' }, [
          imgEl,
          el('div', { class: 'absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors' })
        ]),
        // Contenido de tarjeta
        el('div', { class: 'p-6 flex flex-col flex-grow' }, [
          el('span', { 
            class: 'text-xs font-bold text-dulce-cyan uppercase tracking-wider mb-2',
            text: p.categoria 
          }),
          el('h3', { 
            class: 'font-display text-xl font-bold text-gray-800 mb-2 leading-tight',
            text: p.nombre 
          }),
          el('p', { 
            class: 'text-gray-600 text-sm mb-4 line-clamp-2 flex-grow',
            text: p.descripcion || '' 
          }),
          // Footer tarjeta (precio + agregar)
          el('div', { class: 'flex items-center justify-between mt-auto' }, [
            el('div', { class: 'flex flex-col' }, [
              p.es_oferta_del_dia === 1 && p.precio_oferta ? el('span', { class: 'text-xs text-gray-400 line-through', text: formatPrecio(p.precio) }) : null,
              el('span', { 
                class: 'text-xl font-bold text-dulce-coral',
                text: formatPrecio(p.es_oferta_del_dia === 1 && p.precio_oferta ? p.precio_oferta : p.precio) 
              })
            ]),
            el('button', {
              class: 'bg-dulce-pink/20 hover:bg-dulce-pink text-dulce-pink hover:text-white rounded-full p-2 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-dulce-pink',
              onClick: () => agregarAlCarrito(p)
            }, [
              // Icono plus
              document.createRange().createContextualFragment(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
              `)
            ])
          ])
        ])
      ]);
      
      productsGrid.appendChild(card);
    });
  }

  function setupFilters() {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remover estilos de todos los botones
        filterBtns.forEach(b => {
          b.classList.remove('ring-dulce-cyan', 'ring-dulce-pink', 'ring-amber-700', 'ring-dulce-coral', 'active-cat');
        });
        
        const cat = e.currentTarget.dataset.cat;
        
        // Agregar anillo según la categoría
        if (cat === 'todos') {
          e.currentTarget.classList.add('ring-dulce-cyan', 'active-cat');
          renderProducts(allProducts);
        } else if (cat === 'helados') {
          e.currentTarget.classList.add('ring-dulce-pink');
          renderProducts(allProducts.filter(p => p.categoria === 'helados'));
        } else if (cat === 'cafes') {
          e.currentTarget.classList.add('ring-amber-700');
          renderProducts(allProducts.filter(p => p.categoria === 'cafes'));
        } else if (cat === 'preparaciones') {
          e.currentTarget.classList.add('ring-dulce-coral');
          renderProducts(allProducts.filter(p => p.categoria === 'preparaciones'));
        }
      });
    });
  }

  // --- OFERTA DEL DÍA ---
  async function checkOfertaDelDia() {
    try {
      const res = await fetch('/api/productos/oferta');
      const oferta = await res.ok ? await res.json() : null;
      
      if (oferta && oferta.id) {
        currentOfertaProduct = oferta;
        mostrarOfertaModal(oferta);
      }
    } catch (err) {
      console.error('Error verificando oferta del día', err);
    }
  }

  function mostrarOfertaModal(oferta) {
    document.getElementById('oferta-img').src = oferta.imagen_path || 'https://via.placeholder.com/400x400?text=Oferta';
    document.getElementById('oferta-nombre').textContent = oferta.nombre;
    document.getElementById('oferta-desc').textContent = oferta.descripcion || '';
    
    const precioContainer = document.getElementById('oferta-precio');
    precioContainer.replaceChildren();
    if (oferta.precio_oferta) {
      precioContainer.appendChild(el('span', { class: 'text-lg text-gray-400 line-through mr-3', text: formatPrecio(oferta.precio) }));
      precioContainer.appendChild(el('span', { class: 'text-4xl font-black text-dulce-coral', text: formatPrecio(oferta.precio_oferta) }));
    } else {
      precioContainer.textContent = formatPrecio(oferta.precio);
    }
    
    ofertaModal.classList.remove('hidden');
    setTimeout(() => {
      ofertaModal.classList.remove('opacity-0');
      ofertaContent.classList.remove('scale-95');
      ofertaContent.classList.add('scale-100');
    }, 50);
  }

  closeOferta.addEventListener('click', () => {
    ofertaModal.classList.add('opacity-0');
    ofertaContent.classList.remove('scale-100');
    ofertaContent.classList.add('scale-95');
    
    setTimeout(() => {
      ofertaModal.classList.add('hidden');
    }, 500);
  });

  btnOfertaAdd.addEventListener('click', () => {
    if (currentOfertaProduct) {
      agregarAlCarrito(currentOfertaProduct);
      closeOferta.click();
    }
  });

  // --- LÓGICA DEL MODAL DE DETALLE ---
  function setupDetalleListeners() {
    closeDetalle.addEventListener('click', cerrarDetalleModal);
    
    detalleModal.addEventListener('click', (e) => {
      if (e.target === detalleModal) {
        cerrarDetalleModal();
      }
    });

    btnDetalleAdd.addEventListener('click', () => {
      if (currentDetailProduct) {
        agregarAlCarrito(currentDetailProduct);
        cerrarDetalleModal();
      }
    });
  }

  function abrirDetalleModal(producto) {
    currentDetailProduct = producto;
    
    document.getElementById('detalle-img').src = producto.imagen_path || 'https://via.placeholder.com/400x400?text=Dulcería';
    document.getElementById('detalle-img').alt = producto.nombre;
    document.getElementById('detalle-nombre').textContent = producto.nombre;
    
    let catText = producto.categoria;
    if (producto.categoria === 'helados') catText = '🍦 Helados';
    else if (producto.categoria === 'cafes') catText = '☕ Cafés';
    else if (producto.categoria === 'preparaciones') catText = '🍰 Preparaciones';
    
    document.getElementById('detalle-categoria').textContent = catText;
    document.getElementById('detalle-desc').textContent = producto.descripcion || 'Este delicioso producto no tiene descripción aún.';
    
    const precioOriginalEl = document.getElementById('detalle-precio-original');
    const precioEl = document.getElementById('detalle-precio');
    
    if (producto.es_oferta_del_dia === 1 && producto.precio_oferta) {
      precioOriginalEl.textContent = formatPrecio(producto.precio);
      precioOriginalEl.classList.remove('hidden');
      precioEl.textContent = formatPrecio(producto.precio_oferta);
    } else {
      precioOriginalEl.classList.add('hidden');
      precioEl.textContent = formatPrecio(producto.precio);
    }
    
    detalleModal.classList.remove('hidden');
    setTimeout(() => {
      detalleModal.classList.remove('opacity-0');
      detalleContent.classList.remove('scale-95');
      detalleContent.classList.add('scale-100');
    }, 50);
  }

  function cerrarDetalleModal() {
    detalleModal.classList.add('opacity-0');
    detalleContent.classList.remove('scale-100');
    detalleContent.classList.add('scale-95');
    
    setTimeout(() => {
      detalleModal.classList.add('hidden');
    }, 300);
  }

  // --- LÓGICA DEL CARRITO DE COMPRAS ---

  function setupCartListeners() {
    btnCartTrigger.addEventListener('click', abrirCartModal);
    closeCart.addEventListener('click', cerrarCartModal);
    
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) {
        cerrarCartModal();
      }
    });

    orderForm.addEventListener('submit', realizarPedido);
  }

  function abrirCartModal() {
    renderCarrito();
    orderError.classList.add('hidden');
    orderSuccessMsg.classList.add('hidden');
    
    // Auto-rellenar fecha mínima (hora actual + 30 min)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    // Convertir a formato datetime-local (YYYY-MM-DDTHH:MM)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    orderPickupDate.min = `${year}-${month}-${day}T${hours}:${minutes}`;
    orderPickupDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;

    cartModal.classList.remove('hidden');
    setTimeout(() => {
      cartModal.classList.remove('opacity-0');
      cartContent.classList.remove('scale-95');
      cartContent.classList.add('scale-100');
    }, 50);
  }

  function cerrarCartModal() {
    cartModal.classList.add('opacity-0');
    cartContent.classList.remove('scale-100');
    cartContent.classList.add('scale-95');
    
    setTimeout(() => {
      cartModal.classList.add('hidden');
    }, 300);
  }

  function agregarAlCarrito(producto) {
    const existe = cart.find(item => item.producto_id === producto.id);
    if (existe) {
      existe.cantidad++;
    } else {
      cart.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: (producto.es_oferta_del_dia === 1 && producto.precio_oferta) ? producto.precio_oferta : producto.precio,
        imagen_path: producto.imagen_path,
        cantidad: 1
      });
    }
    
    guardarCarritoEnStorage();
    actualizarBadge();
    
    // Animación del botón flotante de carrito
    btnCartTrigger.classList.add('scale-125');
    setTimeout(() => {
      btnCartTrigger.classList.remove('scale-125');
    }, 200);
  }

  function actualizarCantidad(producto_id, delta) {
    const item = cart.find(x => x.producto_id === producto_id);
    if (!item) return;

    item.cantidad += delta;
    if (item.cantidad <= 0) {
      eliminarDelCarrito(producto_id);
    } else {
      guardarCarritoEnStorage();
      renderCarrito();
    }
  }

  function eliminarDelCarrito(producto_id) {
    cart = cart.filter(item => item.producto_id !== producto_id);
    guardarCarritoEnStorage();
    renderCarrito();
  }

  function renderCarrito() {
    cartItemsContainer.replaceChildren();
    
    let total = 0;
    
    if (cart.length === 0) {
      cartItemsContainer.appendChild(
        el('div', { class: 'text-center text-gray-500 py-8 flex flex-col items-center justify-center gap-2' }, [
          el('span', { class: 'text-4xl', text: '🧁' }),
          el('p', { class: 'font-medium text-sm', text: 'Tu carrito está vacío.' }),
          el('p', { class: 'text-xs text-gray-400', text: '¡Agrega algunos helados o postres!' })
        ])
      );
      cartTotal.textContent = '$0';
      actualizarBadge();
      return;
    }

    cart.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;

      const itemEl = el('div', { class: 'flex items-center justify-between bg-white/70 p-3 rounded-xl border border-pink-100/50 shadow-sm' }, [
        // Detalles del producto
        el('div', { class: 'flex-grow pr-3' }, [
          el('h4', { class: 'font-bold text-gray-800 text-sm leading-tight', text: item.nombre }),
          el('span', { class: 'text-xs text-dulce-coral font-semibold', text: `${formatPrecio(item.precio)} c/u` })
        ]),
        // Controles de cantidad
        el('div', { class: 'flex items-center gap-2' }, [
          el('button', { 
            class: 'w-6 h-6 rounded-full bg-pink-100 hover:bg-dulce-pink hover:text-white flex items-center justify-center text-dulce-pink font-bold text-xs transition-colors',
            text: '-',
            onClick: () => actualizarCantidad(item.producto_id, -1)
          }),
          el('span', { class: 'w-6 text-center font-bold text-sm text-gray-800', text: item.cantidad }),
          el('button', { 
            class: 'w-6 h-6 rounded-full bg-pink-100 hover:bg-dulce-pink hover:text-white flex items-center justify-center text-dulce-pink font-bold text-xs transition-colors',
            text: '+',
            onClick: () => actualizarCantidad(item.producto_id, 1)
          }),
          el('span', { class: 'w-16 text-right font-bold text-gray-800 text-sm ml-2', text: formatPrecio(subtotal) }),
          // Botón borrar
          el('button', {
            class: 'text-red-400 hover:text-red-600 ml-2 focus:outline-none',
            onClick: () => eliminarDelCarrito(item.producto_id)
          }, [
            document.createRange().createContextualFragment(`
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            `)
          ])
        ])
      ]);

      cartItemsContainer.appendChild(itemEl);
    });

    cartTotal.textContent = formatPrecio(total);
    actualizarBadge();
  }

  function actualizarBadge() {
    const count = cart.reduce((acc, item) => acc + item.cantidad, 0);
    cartBadge.textContent = count;
    
    if (count > 0) {
      cartBadge.classList.remove('scale-0');
      cartBadge.classList.add('scale-100');
    } else {
      cartBadge.classList.remove('scale-100');
      cartBadge.classList.add('scale-0');
    }
  }

  function cargarCarritoDesdeStorage() {
    try {
      const stored = localStorage.getItem('dulceria_cart');
      if (stored) {
        cart = JSON.parse(stored);
        actualizarBadge();
      }
    } catch (e) {
      cart = [];
    }
  }

  function guardarCarritoEnStorage() {
    localStorage.setItem('dulceria_cart', JSON.stringify(cart));
  }

  // Enviar Pedido al Servidor
  async function realizarPedido(e) {
    e.preventDefault();
    orderError.classList.add('hidden');
    orderSuccessMsg.classList.add('hidden');

    if (!currentUser) {
      orderError.textContent = 'Debes iniciar sesión para realizar un pedido anticipado.';
      orderError.classList.remove('hidden');
      abrirAuthModal();
      return;
    }

    if (cart.length === 0) {
      orderError.textContent = 'El carrito está vacío.';
      orderError.classList.remove('hidden');
      return;
    }

    const fechaRecogida = orderPickupDate.value;
    if (!fechaRecogida) {
      orderError.textContent = 'Por favor selecciona la fecha y hora de recogida.';
      orderError.classList.remove('hidden');
      return;
    }

    const payload = {
      detalles: cart,
      fecha_recogida: fechaRecogida
    };

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        orderSuccessMsg.textContent = `¡Pedido #${data.pedidoId} creado! Acumularás ${data.puntosGanados} puntos cuando esté listo.`;
        orderSuccessMsg.classList.remove('hidden');
        
        // Limpiar Carrito
        cart = [];
        guardarCarritoEnStorage();
        renderCarrito();

        // Actualizar sesión para reflejar nuevos puntos
        await checkSession();

        // Cerrar modal automáticamente después de 2.5s
        setTimeout(() => {
          cerrarCartModal();
        }, 2500);
      } else {
        orderError.textContent = data.error || 'Error al procesar el pedido.';
        orderError.classList.remove('hidden');
      }
    } catch (err) {
      orderError.textContent = 'Error de conexión al enviar el pedido.';
      orderError.classList.remove('hidden');
    }
  }

  // --- LÓGICA DE HISTORIAL DE PEDIDOS ---

  function setupOrdersListeners() {
    closeOrders.addEventListener('click', cerrarOrdersModal);
    ordersModal.addEventListener('click', (e) => {
      if (e.target === ordersModal) {
        cerrarOrdersModal();
      }
    });
  }

  async function abrirOrdersModal() {
    ordersModal.classList.remove('hidden');
    setTimeout(() => {
      ordersModal.classList.remove('opacity-0');
      ordersContent.classList.remove('scale-95');
      ordersContent.classList.add('scale-100');
    }, 50);

    await cargarMisPedidos();
  }

  function cerrarOrdersModal() {
    ordersModal.classList.add('opacity-0');
    ordersContent.classList.remove('scale-100');
    ordersContent.classList.add('scale-95');
    
    setTimeout(() => {
      ordersModal.classList.add('hidden');
    }, 300);
  }

  async function cargarMisPedidos() {
    ordersListContainer.replaceChildren();
    
    ordersListContainer.appendChild(
      el('p', { class: 'text-center text-gray-500 py-6 text-sm', text: 'Cargando tus pedidos...' })
    );

    try {
      const res = await fetch('/api/pedidos');
      if (res.ok) {
        const pedidos = await res.json();
        renderMisPedidos(pedidos);
      } else {
        ordersListContainer.replaceChildren(
          el('p', { class: 'text-center text-red-500 py-6 text-sm', text: 'Error al recuperar tus pedidos.' })
        );
      }
    } catch (err) {
      console.error('Error al cargar mis pedidos:', err);
      ordersListContainer.replaceChildren(
        el('p', { class: 'text-center text-red-500 py-6 text-sm', text: 'Error de conexión.' })
      );
    }
  }

  function renderMisPedidos(pedidos) {
    ordersListContainer.replaceChildren();

    if (pedidos.length === 0) {
      ordersListContainer.appendChild(
        el('p', { class: 'text-center text-gray-500 py-8 text-sm font-medium', text: 'Aún no tienes pedidos registrados.' })
      );
      return;
    }

    pedidos.forEach(p => {
      let items = [];
      try {
        items = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : p.detalles;
      } catch (e) {
        items = [];
      }

      // Convertir fecha de recogida a legible en español
      let fechaText = p.fecha_recogida;
      try {
        const d = new Date(p.fecha_recogida);
        fechaText = d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      } catch (e) {}

      // Estado Badge
      const esListo = p.estado === 'Listo';
      const statusBadge = el('span', {
        class: `px-3 py-1 rounded-full text-xs font-bold ${
          esListo ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'
        }`,
        text: p.estado
      });

      // Crear lista de productos pedidos
      const productListElements = items.map(item => {
        return el('li', { class: 'text-xs text-gray-600 flex justify-between' }, [
          el('span', { text: `${item.nombre} x${item.cantidad}` }),
          el('span', { class: 'font-semibold', text: formatPrecio(item.precio * item.cantidad) })
        ]);
      });

      const orderCard = el('div', { class: 'bg-white/60 p-4 rounded-2xl border border-pink-100 shadow-sm space-y-3' }, [
        // Fila 1: ID y Estado
        el('div', { class: 'flex justify-between items-center' }, [
          el('span', { class: 'font-bold text-dulce-cyan text-sm', text: `Pedido #${p.id}` }),
          statusBadge
        ]),
        // Fila 2: Lista de Productos
        el('ul', { class: 'divide-y divide-pink-50/50 space-y-1 pb-2 border-b border-pink-50' }, productListElements),
        // Fila 3: Total y Recogida
        el('div', { class: 'flex justify-between items-center pt-1 text-xs' }, [
          el('span', { class: 'text-gray-500' }, [
            "Recoger: ",
            el('strong', { class: 'text-gray-700', text: fechaText })
          ]),
          el('span', { class: 'text-sm font-bold text-dulce-coral', text: formatPrecio(p.total) })
        ])
      ]);

      ordersListContainer.appendChild(orderCard);
    });
  }

  // Verificar si existe el catálogo PDF en el servidor
  async function checkCatalog() {
    if (!btnDownloadCatalog) return;
    try {
      const res = await fetch('/api/catalogo/exists');
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          btnDownloadCatalog.classList.remove('hidden');
        } else {
          btnDownloadCatalog.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('Error al verificar existencia del catálogo:', err);
    }
  }
});

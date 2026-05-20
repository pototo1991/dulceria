document.addEventListener('DOMContentLoaded', () => {
  let csrfToken = '';
  let products = [];

  // Elementos DOM de Autenticación
  const loginModal = document.getElementById('login-modal');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const adminPanel = document.getElementById('admin-panel');
  const logoutBtn = document.getElementById('logout-btn');

  // Elementos DOM de Pestañas
  const tabBtnProductos = document.getElementById('tab-btn-productos');
  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
  const tabBtnClientes = document.getElementById('tab-btn-clientes');

  const tabProductos = document.getElementById('tab-productos');
  const tabPedidos = document.getElementById('tab-pedidos');
  const tabClientes = document.getElementById('tab-clientes');

  // Contenedores de Tablas
  const productosTbody = document.getElementById('productos-tbody');
  const pedidosTbody = document.getElementById('pedidos-tbody');
  const clientesTbody = document.getElementById('clientes-tbody');

  // Modal Producto
  const productModal = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalTitle = document.getElementById('modal-title');
  const btnAddProduct = document.getElementById('btn-add-product');
  const imgPreview = document.getElementById('img-preview');

  // Campos de formulario de Producto
  const prodIdInput = document.getElementById('prod-id');
  const prodNombreInput = document.getElementById('prod-nombre');
  const prodPrecioInput = document.getElementById('prod-precio');
  const prodCategoriaSelect = document.getElementById('prod-categoria');
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

  // --- AYUDANTE DE ELEMENTOS SEGURO (PREVENCIÓN XSS) ---
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
  initAdmin();

  async function initAdmin() {
    await fetchCSRFToken();
    await verificarSesionAdmin();
    setupTabListeners();
    setupModalListeners();
    setupLoginFormListener();
    setupProductFormListener();
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

  // Verificar si hay sesión de Administrador
  async function verificarSesionAdmin() {
    try {
      const res = await fetch('/api/usuario');
      if (res.ok) {
        const user = await res.json();
        if (user.rol === 'admin') {
          mostrarDashboard();
        } else {
          loginError.textContent = 'Acceso denegado. Se requiere cuenta de Administrador.';
          loginError.classList.remove('hidden');
          mostrarLoginModal();
        }
      } else {
        mostrarLoginModal();
      }
    } catch (err) {
      mostrarLoginModal();
    }
  }

  function mostrarLoginModal() {
    loginModal.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }

  function mostrarDashboard() {
    loginModal.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    cargarProductos();
    cargarPedidos();
    cargarClientes();
  }

  // Configurar envío del login de administrador
  function setupLoginFormListener() {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
          if (data.rol === 'admin') {
            mostrarDashboard();
          } else {
            loginError.textContent = 'Acceso denegado. Se requiere cuenta de Administrador.';
            loginError.classList.remove('hidden');
          }
        } else {
          loginError.textContent = data.error || 'Credenciales inválidas.';
          loginError.classList.remove('hidden');
        }
      } catch (err) {
        loginError.textContent = 'Error de comunicación con el servidor.';
        loginError.classList.remove('hidden');
      }
    });

    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken }
        });
        window.location.reload();
      } catch (err) {
        console.error('Error al cerrar sesión:', err);
      }
    });
  }

  // --- NAVEGACIÓN POR PESTAÑAS (TABS) ---
  function setupTabListeners() {
    const tabs = [
      { btn: tabBtnProductos, content: tabProductos },
      { btn: tabBtnPedidos, content: tabPedidos },
      { btn: tabBtnClientes, content: tabClientes }
    ];

    tabs.forEach(tab => {
      tab.btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active', 'border-dulce-cyan', 'text-dulce-cyan');
          t.btn.classList.add('border-transparent', 'text-gray-600');
          t.content.classList.add('hidden');
        });

        tab.btn.classList.add('active', 'border-dulce-cyan', 'text-dulce-cyan');
        tab.btn.classList.remove('border-transparent', 'text-gray-600');
        tab.content.classList.remove('hidden');
      });
    });
  }

  // --- CRUD PRODUCTOS ---

  async function cargarProductos() {
    try {
      const res = await fetch('/api/productos');
      products = await res.json();
      renderProductosTable(products);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }

  function renderProductosTable(productsList) {
    productosTbody.replaceChildren();

    if (productsList.length === 0) {
      productosTbody.appendChild(
        el('tr', {}, [
          el('td', { 
            class: 'p-4 text-center text-gray-500 font-medium', 
            colspan: '6', 
            text: 'No hay productos registrados.' 
          })
        ])
      );
      return;
    }

    productsList.forEach(p => {
      const isOffer = p.es_oferta_del_dia === 1;

      // Toggle switch para Oferta del Día
      const offerToggle = el('input', {
        type: 'checkbox',
        class: 'sr-only peer',
        checked: isOffer ? true : undefined,
        onChange: (e) => toggleOfertaDelDia(p.id, e.target.checked, p.precio)
      });

      const toggleWrapper = el('label', { class: 'relative inline-flex items-center cursor-pointer justify-center w-full' }, [
        offerToggle,
        el('div', { class: "w-11 h-6 bg-pink-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-pink-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dulce-cyan" })
      ]);

      const tr = el('tr', { class: 'hover:bg-pink-50/20 transition-colors' }, [
        // Col Imagen
        el('td', { class: 'p-4 border-b border-pink-100/50' }, [
          el('img', {
            src: p.imagen_path || 'https://via.placeholder.com/80x80?text=Dulces',
            alt: p.nombre,
            class: 'w-12 h-12 object-cover rounded-xl border border-pink-200'
          })
        ]),
        // Col Nombre/Desc
        el('td', { class: 'p-4 border-b border-pink-100/50' }, [
          el('div', { class: 'font-bold text-gray-800 text-sm', text: p.nombre }),
          el('div', { class: 'text-xs text-gray-400 line-clamp-1 max-w-[200px]', text: p.descripcion || '' })
        ]),
        // Col Categoría
        el('td', { class: 'p-4 border-b border-pink-100/50' }, [
          el('span', { 
            class: 'text-xs font-semibold px-2.5 py-0.5 rounded-full bg-dulce-cyan/10 text-dulce-cyan uppercase tracking-wider', 
            text: p.categoria 
          })
        ]),
        // Col Precio
        el('td', { class: 'p-4 border-b border-pink-100/50 font-semibold text-dulce-coral' }, [
          isOffer && p.precio_oferta ? el('span', { class: 'line-through text-gray-400 text-xs mr-2', text: formatPrecio(p.precio) }) : null,
          el('span', { text: formatPrecio(isOffer && p.precio_oferta ? p.precio_oferta : p.precio) })
        ]),
        // Col Oferta del Día
        el('td', { class: 'p-4 border-b border-pink-100/50 text-center' }, [toggleWrapper]),
        // Col Acciones
        el('td', { class: 'p-4 border-b border-pink-100/50 text-right space-x-2' }, [
          el('button', {
            class: 'text-dulce-cyan hover:text-dulce-cyan/80 font-semibold text-xs py-1 px-3.5 rounded-full bg-dulce-cyan/10 hover:bg-dulce-cyan/20 transition',
            text: 'Editar',
            onClick: () => abrirEditarProductoModal(p)
          }),
          el('button', {
            class: 'text-red-500 hover:text-red-600 font-semibold text-xs py-1 px-3 rounded-full bg-red-50 hover:bg-red-100 transition',
            text: 'Eliminar',
            onClick: () => eliminarProducto(p.id)
          })
        ])
      ]);

      productosTbody.appendChild(tr);
    });
  }

  // Activar o desactivar Oferta del Día
  async function toggleOfertaDelDia(id, active, currentPrice) {
    let precioOferta = null;
    if (active) {
      let input = prompt('Ingresa el nuevo precio de oferta para este producto:', Math.round(currentPrice * 0.9));
      if (input === null) {
        // Usuario canceló, revertir UI
        await cargarProductos();
        return;
      }
      precioOferta = parseInt(input.replace(/\D/g, ''), 10);
      if (!precioOferta) precioOferta = currentPrice;
    }
    
    const estado = active ? 1 : 0;
    try {
      const res = await fetch(`/api/productos/${id}/oferta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ estado, precio_oferta: precioOferta })
      });
      if (res.ok) {
        await cargarProductos();
      } else {
        alert('Error al actualizar oferta del día');
        await cargarProductos();
      }
    } catch (err) {
      console.error('Error al cambiar oferta del día:', err);
      await cargarProductos();
    }
  }

  // Eliminar producto
  async function eliminarProducto(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken }
      });
      if (res.ok) {
        await cargarProductos();
      } else {
        alert('No se pudo eliminar el producto.');
      }
    } catch (err) {
      console.error('Error al eliminar producto:', err);
    }
  }

  // Modales CRUD Producto
  function setupModalListeners() {
    btnAddProduct.addEventListener('click', abrirNuevoProductoModal);
    closeModalBtn.addEventListener('click', cerrarProductModal);
    
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) {
        cerrarProductModal();
      }
    });

    prodPrecioInput.addEventListener('input', (e) => {
      let start = e.target.selectionStart;
      let oldLength = e.target.value.length;
      
      let formatted = formatPrecio(e.target.value);
      
      e.target.value = formatted;
      
      let newLength = formatted.length;
      let cursorPosition = start + (newLength - oldLength);
      // Solo restaurar la posición del cursor si el campo está en foco
      if (document.activeElement === e.target) {
        e.target.setSelectionRange(cursorPosition, cursorPosition);
      }
    });

    prodImagenInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          imgPreview.src = event.target.result;
          imgPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      } else {
        imgPreview.src = '';
        imgPreview.classList.add('hidden');
      }
    });
  }

  function abrirNuevoProductoModal() {
    modalTitle.textContent = 'Nuevo Producto';
    productForm.reset();
    prodIdInput.value = '';
    imgPreview.src = '';
    imgPreview.classList.add('hidden');
    
    productModal.classList.remove('hidden');
  }

  function abrirEditarProductoModal(p) {
    modalTitle.textContent = 'Editar Producto';
    prodIdInput.value = p.id;
    prodNombreInput.value = p.nombre;
    prodPrecioInput.value = formatPrecio(p.precio);
    prodCategoriaSelect.value = p.categoria;
    prodDescripcionTextarea.value = p.descripcion || '';
    
    if (p.imagen_path) {
      imgPreview.src = p.imagen_path;
      imgPreview.classList.remove('hidden');
    } else {
      imgPreview.src = '';
      imgPreview.classList.add('hidden');
    }
    
    productModal.classList.remove('hidden');
  }

  function cerrarProductModal() {
    productModal.classList.add('hidden');
  }

  function setupProductFormListener() {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = prodIdInput.value;
      const nombre = prodNombreInput.value;
      const precioFormateado = prodPrecioInput.value;
      const precio = parseInt(precioFormateado.replace(/\D/g, ''), 10) || 0;
      const categoria = prodCategoriaSelect.value;
      const descripcion = prodDescripcionTextarea.value;
      const file = prodImagenInput.files[0];

      const formData = new FormData();
      formData.append('nombre', nombre);
      formData.append('precio', precio);
      formData.append('categoria', categoria);
      formData.append('descripcion', descripcion);

      // Optimizar imagen en el cliente si hay archivo
      if (file) {
        try {
          // Llama al ImageProcessor de image-processor.js para convertir a WebP y redimensionar a 800x800 px
          const processedBlob = await ImageProcessor.processImage(file, 800, 800);
          formData.append('imagen', processedBlob, 'imagen.webp');
        } catch (err) {
          console.error("Error optimizando imagen:", err);
          alert("Error al optimizar imagen. Se intentará subir en formato original.");
          formData.append('imagen', file);
        }
      }

      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/productos/${id}` : '/api/productos';

      try {
        const res = await fetch(url, {
          method: method,
          headers: {
            'X-CSRF-Token': csrfToken
            // Nota: No poner 'Content-Type', el navegador define multipart boundary automáticamente al enviar FormData
          },
          body: formData
        });

        if (res.ok) {
          cerrarProductModal();
          await cargarProductos();
        } else {
          const data = await res.json();
          alert(data.error || 'Error al guardar producto.');
        }
      } catch (err) {
        console.error('Error al guardar producto:', err);
      }
    });
  }

  // --- GESTIÓN DE PEDIDOS ---

  async function cargarPedidos() {
    try {
      const res = await fetch('/api/pedidos');
      if (res.ok) {
        const orders = await res.json();
        renderPedidosTable(orders);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    }
  }

  function renderPedidosTable(orders) {
    pedidosTbody.replaceChildren();

    if (orders.length === 0) {
      pedidosTbody.appendChild(
        el('tr', {}, [
          el('td', { 
            class: 'p-4 text-center text-gray-500 font-medium', 
            colspan: '7', 
            text: 'No hay pedidos anticipados.' 
          })
        ])
      );
      return;
    }

    orders.forEach(order => {
      let items = [];
      try {
        items = typeof order.detalles === 'string' ? JSON.parse(order.detalles) : order.detalles;
      } catch (e) {
        items = [];
      }

      // Convertir lista de items pedidos a elementos DOM
      const listItemsEl = items.map(item => {
        return el('li', { class: 'text-xs text-gray-600' }, [
          el('strong', { text: item.nombre }),
          ` x${item.cantidad} (${formatPrecio(item.precio * item.cantidad)})`
        ]);
      });
      const itemsList = el('ul', { class: 'space-y-0.5' }, listItemsEl);

      // Formato fecha
      let fechaText = order.fecha_recogida;
      try {
        const d = new Date(order.fecha_recogida);
        fechaText = d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      } catch (e) {}

      // Badge de Estado
      const esListo = order.estado === 'Listo';
      const statusBadge = el('span', {
        class: `px-2.5 py-0.5 rounded-full text-xs font-bold ${
          esListo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'
        }`,
        text: order.estado
      });

      // Botón Acción
      const actionBtn = esListo 
        ? el('span', { class: 'text-gray-400 text-xs font-semibold', text: 'Entregado/Completado' })
        : el('button', {
            class: 'text-white bg-dulce-cyan hover:bg-dulce-cyan/90 font-semibold text-xs py-1 px-3.5 rounded-full shadow-sm hover:shadow transition',
            text: 'Marcar Listo',
            onClick: () => marcarPedidoListo(order.id)
          });

      const tr = el('tr', { class: 'hover:bg-pink-50/20 transition-colors' }, [
        el('td', { class: 'p-4 border-b border-pink-100/50 font-semibold text-gray-800', text: `#${order.id}` }),
        el('td', { class: 'p-4 border-b border-pink-100/50' }, [
          el('div', { class: 'font-bold text-gray-800 text-sm', text: order.cliente_nombre }),
          el('div', { class: 'text-xs text-gray-400', text: order.cliente_email })
        ]),
        el('td', { class: 'p-4 border-b border-pink-100/50' }, [itemsList]),
        el('td', { class: 'p-4 border-b border-pink-100/50 font-bold text-dulce-coral', text: formatPrecio(order.total) }),
        el('td', { class: 'p-4 border-b border-pink-100/50 text-sm text-gray-700 font-medium', text: fechaText }),
        el('td', { class: 'p-4 border-b border-pink-100/50 text-center' }, [statusBadge]),
        el('td', { class: 'p-4 border-b border-pink-100/50 text-right' }, [actionBtn])
      ]);

      pedidosTbody.appendChild(tr);
    });
  }

  async function marcarPedidoListo(id) {
    try {
      const res = await fetch(`/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ estado: 'Listo' })
      });

      if (res.ok) {
        await cargarPedidos();
      } else {
        alert('No se pudo actualizar el estado del pedido.');
      }
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
    }
  }

  // --- GESTIÓN DE CLIENTES ---

  async function cargarClientes() {
    try {
      const res = await fetch('/api/clientes');
      if (res.ok) {
        const usersList = await res.json();
        renderClientesTable(usersList);
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }

  function renderClientesTable(usersList) {
    clientesTbody.replaceChildren();

    if (usersList.length === 0) {
      clientesTbody.appendChild(
        el('tr', {}, [
          el('td', { 
            class: 'p-4 text-center text-gray-500 font-medium', 
            colspan: '4', 
            text: 'No hay clientes fidelizados registrados.' 
          })
        ])
      );
      return;
    }

    usersList.forEach(client => {
      const tr = el('tr', { class: 'hover:bg-pink-50/20 transition-colors' }, [
        el('td', { class: 'p-4 border-b border-pink-100/50 text-gray-700 text-sm', text: `#${client.id}` }),
        el('td', { class: 'p-4 border-b border-pink-100/50 font-bold text-gray-800 text-sm', text: client.nombre }),
        el('td', { class: 'p-4 border-b border-pink-100/50 text-gray-600 text-sm', text: client.email }),
        el('td', { class: 'p-4 border-b border-pink-100/50 text-center font-bold text-dulce-pink', text: `${client.puntos} pts` })
      ]);

      clientesTbody.appendChild(tr);
    });
  }
});

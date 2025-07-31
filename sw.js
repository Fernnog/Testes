// --- START OF FILE sw.js (COMPLETO, CORRIGIDO E ROBUSTO) ---

// A versão do cache. Mude este valor sempre que atualizar os arquivos do app shell
// para forçar a reinstalação do Service Worker.
const CACHE_NAME = 'gerenciador-leitura-cache-v2';

// Lista completa de arquivos essenciais para o funcionamento offline do aplicativo.
// Verifique se todos os caminhos estão corretos em relação à raiz do seu projeto.
const urlsToCache = [
  '.', // A raiz da aplicação
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.ico',
  './logo.png',
  
  // Certifique-se de que a pasta 'imagens' e estes arquivos existem na raiz.
  './imagens/logo_192.png',
  './imagens/logo_512.png',

  // Todos os scripts JavaScript modulares necessários.
  './main.js',
  './modules/dom-elements.js',
  './modules/ui.js',
  './modules/plano-logic.js',
  './modules/state.js',
  './modules/auth.js',
  './modules/firestore-service.js',
  './config/firebase-config.js',
  
  // Recursos externos (fontes e ícones).
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Ubuntu:wght@700&display=swap'
];

// --- Evento 'install': Cacheia os arquivos e força a ativação ---
self.addEventListener('install', event => {
  console.log('[SW] Evento: install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando o App Shell...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Força a ativação imediata do novo Service Worker, pulando a fase de "espera".
        console.log('[SW] Instalação concluída. Pulando a espera (skipWaiting).');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Falha na instalação. Verifique se todos os caminhos em urlsToCache estão corretos e acessíveis.', error);
      })
  );
});

// --- Evento 'activate': Limpa caches antigos e assume o controle ---
self.addEventListener('activate', event => {
    console.log('[SW] Evento: activate');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Cache antigo limpo.');
            // Assume o controle de todas as abas abertas imediatamente.
            return self.clients.claim();
        })
    );
});

// --- Evento 'fetch': Intercepta requisições de rede ---
self.addEventListener('fetch', event => {
  // Ignora requisições que não sejam HTTP/HTTPS (ex: chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // --- Lógica de Bypass para APIs do Firebase ---
  // Não tentamos servir do cache requisições de autenticação ou de banco de dados.
  // Elas devem sempre ir para a rede para garantir dados atualizados.
  const isFirebaseApiRequest = 
    event.request.url.includes('identitytoolkit.googleapis.com') || // Auth
    event.request.url.includes('firestore.googleapis.com');         // Firestore

  if (isFirebaseApiRequest) {
    // Deixa a requisição passar direto para a rede, sem interceptar.
    return; 
  }

  // Para todos os outros recursos (HTML, CSS, JS, imagens, fontes), usamos a estratégia "Cache, falling back to Network".
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se o recurso for encontrado no cache, retorna-o imediatamente.
        if (cachedResponse) {
          // console.log('[SW] Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede.
        // console.log('[SW] Buscando na rede:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Se a busca na rede for bem-sucedida, podemos (opcionalmente) cachear o recurso para futuras visitas.
            // Isso é útil para recursos que não estavam na lista inicial, como as próprias fontes .woff2.
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.error('[SW] Falha ao buscar na rede. O dispositivo pode estar offline.', event.request.url, error);
            // Aqui você poderia retornar uma página offline personalizada.
            // Ex: return caches.match('./offline.html');
        });
      })
  );
});

// --- END OF FILE sw.js ---

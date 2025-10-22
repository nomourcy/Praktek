document.addEventListener('DOMContentLoaded', () => {
    // Variabel global
    let ebookDatabase = [];
    let categories = [];
    let favorites = JSON.parse(localStorage.getItem('ebookFavorites')) || [];
    let currentBookId = null;
    let currentSheetView = 'main';
    let popupTimeout, loaderTimeout;

    // Elemen DOM
    const body = document.body;
    const appContainer = document.getElementById('app-container');
    const overlay = document.getElementById('overlay');
    const loadingOverlay = document.getElementById('loading-overlay');
    const searchModal = document.getElementById('search-modal');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchDefaultContent = document.getElementById('search-default-content');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const ebookDetailModal = document.getElementById('ebook-detail-modal');
    const favoriteBtn = document.getElementById('favorite-btn');
    const mainHeader = document.getElementById('main-header');
    const pageViews = document.querySelectorAll('.page-view');
    const berandaView = document.getElementById('beranda-view');
    const koleksiView = document.getElementById('koleksi-view');
    const discoveryView = document.getElementById('discovery-view');
    const profilView = document.getElementById('profil-view');
    const bannerSlider = document.getElementById('banner-slider');
    const bottomNav = document.getElementById('bottom-navigation');
    const navItems = bottomNav.querySelectorAll('.nav-item, #nav-search-btn');
    const menuBottomSheet = document.getElementById('menu-bottom-sheet');
    const sheetTitle = document.getElementById('sheet-title');
    const sheetBody = document.getElementById('sheet-body');
    const backSheetBtn = menuBottomSheet.querySelector('.back-sheet-btn');
    const closeSheetBtn = menuBottomSheet.querySelector('.close-sheet-btn');
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const updateModalBody = document.getElementById('update-modal-body');

    // --- FUNGSI UTAMA ---
    async function initializeApp() {
        showLoader();
        await loadDatabase();
        setupEventListeners();
        setupBottomNav(); 
        applyInitialTheme();
        setupCategoryTabs();
        navigateTo('beranda', { isInitialLoad: true }); // Panggil navigateTo di sini
        hideLoader();
    }

    async function loadDatabase() {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await fetch('database.json');
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();
            ebookDatabase = data.ebooks.filter(book => book && book.category);
            categories = ["Beranda", ...new Set(ebookDatabase.map(book => book.category))];
        } catch (error) {
            console.error("Gagal memuat database eBook:", error);
            berandaView.innerHTML = `<p>Gagal memuat data. Silakan coba lagi nanti.</p>`;
        }
    }

    // --- LOGIKA UI UMUM ---
    function showLoader() {
        loaderTimeout = setTimeout(() => {
            loadingOverlay.classList.remove('hidden');
        }, 300);
    }
    function hideLoader() {
        clearTimeout(loaderTimeout);
        loadingOverlay.classList.add('hidden');
    }
    function applyTheme(theme) {
        if (theme === 'dark') { body.classList.add('dark-theme'); } 
        else { body.classList.remove('dark-theme'); }
    }
    function toggleTheme() {
        const newTheme = body.classList.contains('dark-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }
    function applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    }
    function getFavorites() { return JSON.parse(localStorage.getItem('ebookFavorites')) || []; }
    function saveFavorites(favs) { localStorage.setItem('ebookFavorites', JSON.stringify(favs)); }
    function toggleFavorite() {
        favorites = getFavorites();
        const bookIndex = favorites.indexOf(currentBookId);
        if (bookIndex > -1) { 
            favorites.splice(bookIndex, 1);
            showToast("Dihapus dari Koleksi", 'remove');
        } else { 
            favorites.push(currentBookId); 
            showToast("Buku Berhasil Ditambahkan", 'add');
        }
        saveFavorites(favorites);
        updateFavoriteButtonState();
    }
    function updateFavoriteButtonState() {
        favorites = getFavorites();
        const isFavorited = favorites.includes(currentBookId);
        favoriteBtn.classList.toggle('favorited', isFavorited);
        favoriteBtn.querySelector('i').className = isFavorited ? 'fas fa-bookmark' : 'far fa-bookmark';
    }
    function closeAllOverlays() {
        menuBottomSheet.classList.remove('visible');
        overlay.classList.remove('visible');
        document.querySelectorAll('.fullscreen-modal').forEach(m => m.classList.remove('visible'));
        body.classList.remove('body-no-scroll', 'search-mode-active');
    }
    function showEbookDetail(bookId) {
        const book = ebookDatabase.find(b => b.id === bookId);
        if (!book) return;

        currentBookId = book.id;
        document.getElementById('detail-cover').src = book.cover;
        document.getElementById('detail-title').textContent = book.title;
        document.getElementById('detail-author').textContent = book.author;
        document.getElementById('detail-synopsis').textContent = book.synopsis;
        document.getElementById('detail-pages').textContent = book.pages;
        document.getElementById('detail-language').textContent = book.language;
        document.getElementById('detail-publisher').textContent = book.publisher;
        document.getElementById('detail-publishedDate').textContent = book.publishedDate;
        
        const readBtn = document.getElementById('detail-read-btn');
        readBtn.href = book.readLink || '#';
        readBtn.target = book.readLink && book.readLink !== '#' ? '_blank' : '_self';

        renderRatingStars(ebookDetailModal.querySelector('#detail-rating'), book.rating);
        updateFavoriteButtonState();
        renderRelevantBooks(book.category, book.id);

        ebookDetailModal.classList.add('visible');
        body.classList.add('body-no-scroll');
    }
    function showToast(message, type = 'add') {
        if (popupTimeout) clearTimeout(popupTimeout);
        
        const iconAdd = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-1-1 1V4zm9 16H6V4h1v9l3-3 3 3V4h2v16z"/></svg>`;
        const iconRemove = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 11H5v2h4v-2zm6 0h-2v2h2v-2zm-4-7h2v2h-2V4zM7 18h10V6H7v12zm2-5h6v2H9v-2zm-4 7h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2z"/></svg>`;

        toastIcon.innerHTML = type === 'add' ? iconAdd : iconRemove;
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        popupTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2500);
    }

    // --- PENGATURAN EVENT LISTENERS ---
    function setupEventListeners() {
        themeToggleBtn.addEventListener('click', toggleTheme);
        overlay.addEventListener('click', closeAllOverlays);
        closeSheetBtn.addEventListener('click', closeAllOverlays);
        backSheetBtn.addEventListener('click', () => populateAndShowSheet('main'));
        
        document.querySelectorAll('[data-modal-target]').forEach(trigger => {
            trigger.addEventListener('click', (e) => { 
                e.preventDefault(); 
                if (trigger.dataset.modalTarget === 'update-modal') renderUpdateLog();
                const modal = document.getElementById(trigger.dataset.modalTarget); 
                modal.classList.add('visible'); 
                body.classList.add('body-no-scroll'); 
            });
        });

        document.querySelectorAll('[data-close-button]').forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.fullscreen-modal');
                modal.classList.remove('visible');
                body.classList.remove('body-no-scroll', 'search-mode-active');

                // [PERBAIKAN 3] Cek apakah sedang di halaman koleksi saat menutup modal detail
                if (modal.id === 'ebook-detail-modal' && !koleksiView.classList.contains('hidden')) {
                    renderFavoriteBooks(); // Jika ya, render ulang halaman koleksi
                }
            });
        });

        searchInput.addEventListener('input', (e) => performSearch(e.target.value));
        document.body.addEventListener('click', (e) => {
            const ebookCard = e.target.closest('.ebook-card');
            if (ebookCard && !e.target.closest('#bottom-navigation')) { e.preventDefault(); const bookId = parseInt(ebookCard.dataset.ebookId, 10); showEbookDetail(bookId); }
        });
        favoriteBtn.addEventListener('click', toggleFavorite);
        sheetBody.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('.sheet-item');
            if (!target) return;
            const discoverType = target.dataset.discover;
            const discoverValue = target.dataset.value;
            if (discoverValue) { showDiscoveryResults(discoverType, discoverValue); } 
            else { populateAndShowSheet(discoverType); }
        });
    }
    
    // --- LOGIKA NAVIGASI TERPUSAT ---
    function navigateTo(viewName, data = {}) {
        const update = () => {
            body.classList.toggle('subpage-active', viewName !== 'beranda');
            navItems.forEach(i => {
                if (i.classList.contains('nav-item')) { 
                    i.classList.toggle('active', i.dataset.target === viewName); 
                }
            });

            pageViews.forEach(v => v.classList.add('hidden'));

            let targetView;
            switch(viewName) {
                case 'koleksi':
                    targetView = koleksiView;
                    renderFavoriteBooks();
                    break;
                case 'profil':
                    targetView = profilView;
                    renderProfilePage();
                    break;
                case 'discovery':
                    targetView = discoveryView;
                    renderDiscoveryPage(data.title, data.books);
                    break;
                case 'beranda':
                default:
                    targetView = berandaView;
                    const isMainBeranda = !data.category || data.category === 'Beranda';
                    bannerSlider.classList.toggle('hidden', !isMainBeranda);
                    renderHomePageContent(data.category);
                    // [PERBAIKAN 1] Panggil setupBannerSlider SETELAH konten beranda dirender
                    if (isMainBeranda) {
                        setupBannerSlider();
                    }
                    break;
            }
            targetView.classList.remove('hidden');
        };

        if (data.isInitialLoad || !document.startViewTransition) {
            update();
        } else {
            document.startViewTransition(update);
        }
    }

    function setupBottomNav() {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.dataset.target;

                if (target === 'cari') {
                    body.classList.add('search-mode-active');
                    searchModal.classList.add('visible');
                    searchInput.focus();
                    body.classList.add('body-no-scroll');
                    if (searchDefaultContent.children.length === 0) renderSearchDefaultContent();
                    performSearch('');
                    return;
                }
                if (target === 'menu') {
                    populateAndShowSheet(currentSheetView);
                    return;
                }
                
                navigateTo(target);
            });
        });
    }

    // --- LOGIKA RENDER KONTEN ---
    function createEbookCard(ebook) { return `<a href="#" class="ebook-card" data-ebook-id="${ebook.id}"><div class="ebook-card-cover"><img src="${ebook.cover}" alt="${ebook.title}" loading="lazy"></div><h5>${ebook.title}</h5></a>`; }
    function createEmptyState(type) {
        const states = {
            koleksi: { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-1-1 1V4zm9 16H6V4h1v9l3-3 3 3V4h2v16z"/></svg>`, title: 'Koleksi Masih Kosong', text: 'Tekan ikon bookmark pada buku untuk menyimpannya di sini.' },
            search: { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`, title: 'Buku Tidak Ditemukan', text: 'Coba gunakan kata kunci yang berbeda atau periksa ejaan.' },
            update: { icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`, title: 'Belum Ada Pembaruan', text: 'Buku-buku yang baru ditambahkan dalam 60 hari terakhir akan muncul di sini.' }
        };
        const s = states[type];
        return `<div class="empty-state">${s.icon}<h4>${s.title}</h4><p>${s.text}</p></div>`;
    }
    function renderHomePageContent(categoryName = 'Beranda') {
        berandaView.querySelectorAll('.category-section').forEach(el => el.remove());
        let html = '';
        if (categoryName === 'Beranda' || !categoryName) {
            categories.forEach((category, index) => {
                const books = (index === 0) ? ebookDatabase.slice().sort(() => 0.5 - Math.random()).slice(0, 10) : ebookDatabase.filter(book => book.category === category);
                const title = (index === 0) ? 'Buku Terpopuler' : category;
                if (books.length > 0) { html += `<div class="category-section"><h4>${title}</h4><div class="popular-ebooks-grid">${books.map(createEbookCard).join('')}</div></div>`; }
            });
        } else {
            const booksToShow = ebookDatabase.filter(book => book.category === categoryName);
            html = `<div class="category-section"><h4>${categoryName}</h4><div class="category-grid-view">${booksToShow.map(createEbookCard).join('')}</div></div>`;
        }
        berandaView.insertAdjacentHTML('beforeend', html);
    }
    function renderSearchDefaultContent() {
        const popularBooks = ebookDatabase.slice(0, 9);
        searchDefaultContent.innerHTML = `<div class="category-section"><h4>Rekomendasi</h4><div class="category-grid-view">${popularBooks.map(createEbookCard).join('')}</div></div>`;
    }
    function renderSearchResults(results) {
        if (results.length === 0) { searchResultsContainer.innerHTML = createEmptyState('search'); return; }
        searchResultsContainer.innerHTML = results.map(book => {
            const ratingHTML = createRatingStarsHTML(book.rating);
            return `<a href="#" class="search-result-item ebook-card" data-ebook-id="${book.id}"><img src="${book.cover}" alt="${book.title}" loading="lazy"><div class="search-result-info"><span class="title">${book.title}</span><span class="author">${book.author}</span><div class="search-result-rating">${ratingHTML}</div></div></a>`;
        }).join('');
    }
    function renderFavoriteBooks() {
        const favoriteIds = getFavorites();
        const header = `<div class="page-header"><h2>Koleksi Saya</h2></div>`;
        if (favoriteIds.length === 0) { koleksiView.innerHTML = header + createEmptyState('koleksi'); return; }
        const favoriteBooks = ebookDatabase.filter(book => favoriteIds.includes(book.id));
        koleksiView.innerHTML = header + `<div class="category-grid-view">${favoriteBooks.map(createEbookCard).join('')}</div>`;
    }
    function renderProfilePage() {
        const favoriteIds = getFavorites();
        document.getElementById('stat-koleksi-buku').textContent = `${favoriteIds.length} Buku`;
        if (favoriteIds.length > 0) {
            const favoriteBooks = ebookDatabase.filter(book => favoriteIds.includes(book.id));
            const categoryCounts = favoriteBooks.reduce((acc, book) => {
                acc[book.category] = (acc[book.category] || 0) + 1;
                return acc;
            }, {});
            const sortedCategories = Object.entries(categoryCounts).sort(([,a],[,b]) => b - a).slice(0, 3).map(([name]) => name).join(', ');
            document.getElementById('stat-kategori-favorit').textContent = sortedCategories;
        } else {
            document.getElementById('stat-kategori-favorit').textContent = '-';
        }
    }
    function renderUpdateLog() {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const newBooks = ebookDatabase.filter(book => new Date(book.publishedDate) > sixtyDaysAgo).sort((a,b) => new Date(b.publishedDate) - new Date(a.publishedDate));
        if (newBooks.length === 0) {
            updateModalBody.innerHTML = createEmptyState('update');
            return;
        }
        updateModalBody.innerHTML = newBooks.map(book => {
            const ratingHTML = createRatingStarsHTML(book.rating);
            return `<a href="#" class="search-result-item ebook-card" data-ebook-id="${book.id}"><img src="${book.cover}" alt="${book.title}" loading="lazy"><div class="search-result-info"><span class="title">${book.title}</span><span class="author">${book.author}</span><div class="search-result-rating">${ratingHTML}</div></div></a>`;
        }).join('');
    }
    function createRatingStarsHTML(rating) {
        let html = `<strong>${rating.toFixed(1)}</strong>`;
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        for(let i=0; i<fullStars; i++) html += '<i class="fas fa-star"></i>';
        if(halfStar) html += '<i class="fas fa-star-half-alt"></i>';
        return html;
    }
    function renderRatingStars(container, rating) {
        container.innerHTML = createRatingStarsHTML(rating);
    }
    function renderRelevantBooks(category, currentId) {
        const relevantGrid = document.getElementById('relevant-books-grid');
        const relevantBooks = ebookDatabase.filter(book => book.category === category && book.id !== currentId).slice(0, 5);
        if (relevantBooks.length > 0) {
            relevantGrid.innerHTML = `<div class="popular-ebooks-grid">${relevantBooks.map(createEbookCard).join('')}</div>`;
            document.getElementById('relevant-books-section').style.display = 'block';
        } else {
            document.getElementById('relevant-books-section').style.display = 'none';
        }
    }
    function performSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        const defaultEl = searchDefaultContent;
        const resultsEl = searchResultsContainer;
        if (!searchTerm) {
            if (!defaultEl.classList.contains('search-view-visible')) {
                resultsEl.classList.remove('search-view-visible'); resultsEl.classList.add('search-view-hidden');
                setTimeout(() => { defaultEl.classList.add('search-view-visible'); defaultEl.classList.remove('search-view-hidden'); }, 200);
            }
        } else {
            const results = ebookDatabase.filter(ebook => ebook.title.toLowerCase().includes(searchTerm) || ebook.author.toLowerCase().includes(searchTerm));
            if (!resultsEl.classList.contains('search-view-visible')) {
                defaultEl.classList.remove('search-view-visible'); defaultEl.classList.add('search-view-hidden');
                setTimeout(() => { renderSearchResults(results); resultsEl.classList.add('search-view-visible'); resultsEl.classList.remove('search-view-hidden'); }, 200);
            } else {
                renderSearchResults(results);
            }
        }
    }
    function setupCategoryTabs() {
        const categoryTabsContainer = document.querySelector('.category-tabs ul');
        const categoryList = categories.filter(c => c !== 'Beranda');
        categoryTabsContainer.innerHTML = `<li><a href="#" class="active">Beranda</a></li>` + categoryList.map(cat => `<li><a href="#">${cat}</a></li>`).join('');
        const categoryLinks = categoryTabsContainer.querySelectorAll('a');
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); if (link.classList.contains('active')) return;
                categoryLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                navigateTo('beranda', { category: link.textContent });
            });
        });
    }
    function populateAndShowSheet(type) {
        currentSheetView = type;
        let title = '';
        let contentHTML = '';
        backSheetBtn.classList.toggle('hidden', type === 'main');
        if (type === 'main') {
            title = 'Telusuri Berdasarkan';
            contentHTML = `<a href="#" class="sheet-item" data-discover="kategori"><i class="fas fa-tags"></i> Kategori</a><a href="#" class="sheet-item" data-discover="penulis"><i class="fas fa-user-pen"></i> Penulis</a><a href="#" class="sheet-item" data-discover="penerbit"><i class="fas fa-building"></i> Penerbit</a>`;
        } else {
            title = `Daftar ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            let items = [];
            if (type === 'kategori') items = categories.filter(c => c !== 'Beranda');
            else if (type === 'penulis') items = [...new Set(ebookDatabase.map(book => book.author))].sort();
            else if (type === 'penerbit') items = [...new Set(ebookDatabase.map(book => book.publisher))].sort();
            contentHTML = items.map(item => `<a href="#" class="sheet-item" data-discover="${type}" data-value="${item}">${item}</a>`).join('');
        }
        sheetTitle.textContent = title;
        sheetBody.innerHTML = contentHTML;
        menuBottomSheet.classList.add('visible');
        overlay.classList.add('visible');
        body.classList.add('body-no-scroll');
    }
    function showDiscoveryResults(type, value) {
        let booksToShow = [];
        let title = `${type.charAt(0).toUpperCase() + type.slice(1)}: ${value}`;
        if (type === 'kategori') booksToShow = ebookDatabase.filter(book => book.category === value);
        else if (type === 'penulis') booksToShow = ebookDatabase.filter(book => book.author === value);
        else if (type === 'penerbit') booksToShow = ebookDatabase.filter(book => book.publisher === value);
        closeAllOverlays();
        navigateTo('discovery', { title: title, books: booksToShow });
        navItems.forEach(i => {
            if(i.classList.contains('nav-item')) { i.classList.remove('active'); }
        });
    }
    function renderDiscoveryPage(title, books) {
        discoveryView.innerHTML = `<div class="page-header"><h2>${title}</h2></div><div class="category-grid-view">${books.map(createEbookCard).join('')}</div>`;
    }
    function setupBannerSlider() {
        const slidesContainer = bannerSlider.querySelector('.slides-container');
        if (!slidesContainer) return;
        const mainCategories = categories.filter(c => c !== 'Beranda');
        let bannerSlidesHTML = '';
        mainCategories.forEach(category => {
            const topBook = ebookDatabase.filter(book => book.category === category).sort((a, b) => b.rating - a.rating)[0];
            if (topBook) {
                const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
                const bannerImage = `assets/banner-${categorySlug}.png`;
                bannerSlidesHTML += `<div class="slide" data-action="detail" data-id="${topBook.id}"><img src="${bannerImage}" alt="Banner ${category}" onerror="this.onerror=null;this.src='${topBook.cover}';"></div>`;
            }
        });
        slidesContainer.innerHTML = bannerSlidesHTML;
        const slides = slidesContainer.querySelectorAll('.slide');
        const dotsContainer = bannerSlider.querySelector('.slider-dots');
        dotsContainer.innerHTML = '';
        if (!slides || slides.length === 0) { bannerSlider.style.display = 'none'; return; }
        let currentIndex = 0, intervalId;
        slides.forEach((_, i) => { const dot = document.createElement('div'); dot.classList.add('dot'); if (i === 0) dot.classList.add('active'); dot.addEventListener('click', () => { goToSlide(i); resetInterval(); }); dotsContainer.appendChild(dot); });
        const dots = dotsContainer.querySelectorAll('.dot');
        function updateDots() { dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex)); }
        function goToSlide(index) { currentIndex = index; slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`; updateDots(); }
        function nextSlide() { currentIndex = (currentIndex + 1) % slides.length; goToSlide(currentIndex); }
        function startInterval() { intervalId = setInterval(nextSlide, 5000); }
        function resetInterval() { clearInterval(intervalId); startInterval(); }
        let startX = 0, currentX = 0, isDragging = false;
        slidesContainer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isDragging = true; clearInterval(intervalId); slidesContainer.style.transition = 'none'; });
        slidesContainer.addEventListener('touchmove', (e) => { if (!isDragging) return; currentX = e.touches[0].clientX; const diff = currentX - startX; slidesContainer.style.transform = `translateX(calc(-${currentIndex * 100}% + ${diff}px))`; });
        slidesContainer.addEventListener('touchend', () => {
            if (!isDragging) return; isDragging = false; const diff = currentX - startX;
            slidesContainer.style.transition = 'transform 0.5s ease-in-out';
            if (diff < -50 && currentIndex < slides.length - 1) currentIndex++;
            else if (diff > 50 && currentIndex > 0) currentIndex--;
            goToSlide(currentIndex); startInterval();
        });
        slidesContainer.addEventListener('click', (e) => {
            const slide = e.target.closest('.slide');
            const action = slide.dataset.action;
            if (action === 'detail') showEbookDetail(parseInt(slide.dataset.id, 10));
            else if (action === 'category') {
                const categoryTabs = document.querySelectorAll('.category-tabs a');
                categoryTabs.forEach(tab => { if (tab.textContent === slide.dataset.value) tab.click(); });
            }
        });
        startInterval();
    }
    
    initializeApp();
});

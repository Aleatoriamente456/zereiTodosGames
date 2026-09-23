// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://erzkdbdwwclefjrzctcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyemtkYmR3d2NsZWZqcnpjdGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzA4MTMsImV4cCI6MjEwNTc0NjgxM30.DJYw8IHqtMfEkCPKMxiS7ocM-fBBVu-anR8Jme8QWk4';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ESTADO GLOBAL DA APLICAÇÃO ---
let games = [];
let reviews = [];
let selectedRating = 0;
let gameToDeleteId = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

async function loadData() {
    games = await StorageService.getGames();
    reviews = await StorageService.getReviews();
    renderCatalog();
    renderProfile();
    renderAdminTable();
}

// --- SERVIÇO DE DADOS COM SUPABASE (ASSÍNCRONO) ---
const StorageService = {
    async getGames() {
        const { data, error } = await _supabase
            .from('games')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Erro ao carregar jogos:', error);
            showToast('Erro ao carregar jogos do banco de dados.');
            return [];
        }
        return data.map(g => ({
            id: g.id,
            title: g.title,
            developer: g.developer,
            releaseYear: g.release_year,
            coverUrl: g.cover_url,
            synopsis: g.synopsis
        }));
    },

    async addGame(game) {
        const { data, error } = await _supabase
            .from('games')
            .insert([{
                title: game.title,
                developer: game.developer,
                release_year: game.releaseYear,
                cover_url: game.coverUrl,
                synopsis: game.synopsis
            }]);
        if (error) console.error('Erro ao adicionar jogo:', error);
        return { data, error };
    },

    async updateGame(id, game) {
        const { data, error } = await _supabase
            .from('games')
            .update({
                title: game.title,
                developer: game.developer,
                release_year: game.releaseYear,
                cover_url: game.coverUrl,
                synopsis: game.synopsis
            })
            .eq('id', id);
        if (error) console.error('Erro ao atualizar jogo:', error);
        return { data, error };
    },

    async deleteGame(id) {
        const { data, error } = await _supabase
            .from('games')
            .delete()
            .eq('id', id);
        if (error) console.error('Erro ao eliminar jogo:', error);
        return { data, error };
    },

    async getReviews() {
        const { data, error } = await _supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Erro ao carregar análises:', error);
            return [];
        }
        return data.map(r => ({
            id: r.id,
            gameId: r.game_id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at
        }));
    },

    async addReview(review) {
        const { data, error } = await _supabase
            .from('reviews')
            .insert([{
                game_id: review.gameId,
                rating: review.rating,
                comment: review.comment
            }]);
        if (error) console.error('Erro ao guardar análise:', error);
        return { data, error };
    }
};

// --- NAVEGAÇÃO ENTRE VISTAS ---
function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`${viewName}-view`).classList.add('active');
    document.getElementById(`nav-${viewName}`).classList.add('active');

    if (viewName === 'profile') {
        renderProfile();
    } else if (viewName === 'admin') {
        renderAdminTable();
    }
}

// --- UTILITÁRIOS E AUXILIARES ---
function calculateAverageRating(gameId) {
    const gameReviews = reviews.filter(r => r.gameId === gameId);
    if (gameReviews.length === 0) return 0;
    const sum = gameReviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / gameReviews.length).toFixed(1);
}

function renderStarsHTML(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.round(rating)) {
            stars += '<i class="fa-solid fa-star"></i>';
        } else {
            stars += '<i class="fa-regular fa-star"></i>';
        }
    }
    return stars;
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- RENDERIZAÇÃO DO CATÁLOGO ---
function renderCatalog() {
    const grid = document.getElementById('games-grid');
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    let filtered = games.filter(g => 
        g.title.toLowerCase().includes(searchQuery) || 
        g.developer.toLowerCase().includes(searchQuery)
    );

    filtered.sort((a, b) => {
        if (sortBy === 'rating-desc') {
            return calculateAverageRating(b.id) - calculateAverageRating(a.id);
        } else if (sortBy === 'year-desc') {
            return b.releaseYear - a.releaseYear;
        } else if (sortBy === 'year-asc') {
            return a.releaseYear - b.releaseYear;
        } else if (sortBy === 'title-asc') {
            return a.title.localeCompare(b.title);
        }
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum jogo encontrado no Supabase.</p>`;
        return;
    }

    grid.innerHTML = filtered.map(game => {
        const avg = calculateAverageRating(game.id);
        return `
            <div class="game-card" onclick="openGameModal('${game.id}')">
                <div class="card-cover-wrapper">
                    <img src="${game.coverUrl}" alt="${game.title}" class="card-cover" onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Capa'">
                    <div class="card-badge">
                        <i class="fa-solid fa-star"></i> ${avg > 0 ? avg : 'N/A'}
                    </div>
                </div>
                <div class="card-info">
                    <h4 class="card-title">${game.title}</h4>
                    <div class="card-meta">
                        <span>${game.developer}</span>
                        <span>${game.releaseYear}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleSearch() {
    renderCatalog();
}

function handleSort() {
    renderCatalog();
}

// --- MODAL DE DETALHES E AVALIAÇÃO ---
function openGameModal(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const gameReviews = reviews.filter(r => r.gameId === gameId);
    const avgRating = calculateAverageRating(gameId);
    selectedRating = 0;

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-detail-header">
            <img src="${game.coverUrl}" class="modal-cover" alt="${game.title}" onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Capa'">
            <div class="modal-info">
                <h2 class="modal-title">${game.title}</h2>
                <p class="modal-developer">${game.developer} • ${game.releaseYear}</p>
                <div class="modal-rating-badge">
                    <i class="fa-solid fa-star"></i> ${avgRating > 0 ? avgRating : 'Sem avaliações'}
                </div>
                <p class="modal-synopsis">${game.synopsis || 'Sem sinopse disponível.'}</p>
            </div>
        </div>

        <div class="add-review-box">
            <h3>Avaliar este jogo</h3>
            <div class="star-rating-input" id="star-selector">
                <i class="fa-solid fa-star" onclick="setRating(1)"></i>
                <i class="fa-solid fa-star" onclick="setRating(2)"></i>
                <i class="fa-solid fa-star" onclick="setRating(3)"></i>
                <i class="fa-solid fa-star" onclick="setRating(4)"></i>
                <i class="fa-solid fa-star" onclick="setRating(5)"></i>
            </div>
            <div class="form-group">
                <textarea id="review-comment-input" rows="3" placeholder="Escreve a tua opinião sobre o jogo..."></textarea>
            </div>
            <button class="btn btn-primary" onclick="submitReview('${game.id}')">
                <i class="fa-solid fa-paper-plane"></i> Enviar Análise
            </button>
        </div>

        <h3 class="section-title"><i class="fa-solid fa-comments"></i> Análises da Comunidade</h3>
        <div class="reviews-list">
            ${gameReviews.length === 0 ? '<p style="color: var(--text-secondary);">Ainda não há análises para este jogo.</p>' : ''}
            ${gameReviews.map(r => `
                <div class="review-item">
                    <div class="review-content">
                        <div class="review-header">
                            <span class="stars">${renderStarsHTML(r.rating)}</span>
                            <span class="review-date">${new Date(r.createdAt).toLocaleDateString('pt-PT')}</span>
                        </div>
                        <p class="review-comment">${r.comment}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('game-modal').classList.remove('hidden');
}

function setRating(value) {
    selectedRating = value;
    const stars = document.querySelectorAll('#star-selector i');
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitReview(gameId) {
    const commentInput = document.getElementById('review-comment-input');
    const comment = commentInput.value.trim();

    if (selectedRating === 0) {
        showToast('Por favor, seleciona pelo menos 1 estrela!');
        return;
    }

    if (!comment) {
        showToast('Escreve um breve comentário para a tua análise.');
        return;
    }

    const { error } = await StorageService.addReview({
        gameId,
        rating: selectedRating,
        comment
    });

    if (!error) {
        showToast('Análise guardada no Supabase!');
        await loadData();
        openGameModal(gameId);
    } else {
        showToast('Erro ao guardar a análise.');
    }
}

function closeGameModal(event) {
    if (!event || event.target.classList.contains('modal-overlay') || event.target.classList.contains('modal-close-btn')) {
        document.getElementById('game-modal').classList.add('hidden');
    }
}

// --- VISTA DE PERFIL ---
function renderProfile() {
    document.getElementById('stat-total-reviews').textContent = reviews.length;
    
    if (reviews.length > 0) {
        const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        document.getElementById('stat-avg-rating').textContent = (sum / reviews.length).toFixed(1);
    } else {
        document.getElementById('stat-avg-rating').textContent = '0.0';
    }

    const reviewsContainer = document.getElementById('user-reviews-list');
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p style="color: var(--text-secondary);">Ainda não realizaste nenhuma análise.</p>';
        return;
    }

    reviewsContainer.innerHTML = reviews.map(r => {
        const game = games.find(g => g.id === r.gameId);
        if (!game) return '';

        return `
            <div class="review-item">
                <img src="${game.coverUrl}" class="review-thumb" alt="${game.title}" onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Capa'">
                <div class="review-content">
                    <div class="review-header">
                        <h4 class="review-game-title">${game.title}</h4>
                        <span class="stars">${renderStarsHTML(r.rating)}</span>
                    </div>
                    <p class="review-comment">${r.comment}</p>
                    <div class="review-date">${new Date(r.createdAt).toLocaleDateString('pt-PT')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// --- GESTÃO DE JOGOS (PAINEL ADMIN) ---
function renderAdminTable() {
    const tbody = document.getElementById('admin-games-tbody');
    tbody.innerHTML = games.map(game => `
        <tr>
            <td><img src="${game.coverUrl}" class="table-thumb" alt="${game.title}" onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Capa'"></td>
            <td><strong>${game.title}</strong><br><small style="color: var(--text-secondary);">${game.developer}</small></td>
            <td>${game.releaseYear}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="editGame('${game.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete" onclick="confirmDeleteGame('${game.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function fixImageUrl(url) {
    if (!url) return '';
    let trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
        return 'https://' + trimmed;
    }
    return trimmed;
}

async function handleGameFormSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('game-id').value;
    const rawCoverUrl = document.getElementById('game-cover').value;

    const gameData = {
        title: document.getElementById('game-title').value.trim(),
        developer: document.getElementById('game-developer').value.trim(),
        releaseYear: parseInt(document.getElementById('game-year').value),
        coverUrl: fixImageUrl(rawCoverUrl), // Fixa o URL antes de enviar
        synopsis: document.getElementById('game-synopsis').value.trim()
    };

    let result;
    if (id) {
        result = await StorageService.updateGame(id, gameData);
        if (!result.error) showToast('Jogo e capa atualizados no Supabase!');
    } else {
        result = await StorageService.addGame(gameData);
        if (!result.error) showToast('Jogo adicionado ao Supabase!');
    }

    if (!result.error) {
        resetGameForm();
        await loadData();
    } else {
        showToast('Ocorreu um erro ao guardar no Supabase.');
    }
}

function editGame(id) {
    const game = games.find(g => g.id === id);
    if (!game) return;

    document.getElementById('game-id').value = game.id;
    document.getElementById('game-title').value = game.title;
    document.getElementById('game-developer').value = game.developer;
    document.getElementById('game-year').value = game.releaseYear;
    document.getElementById('game-cover').value = game.coverUrl; // Preenche o URL da imagem atual
    document.getElementById('game-synopsis').value = game.synopsis || '';

    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Jogo';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

function resetGameForm() {
    document.getElementById('game-form').reset();
    document.getElementById('game-id').value = '';
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Adicionar Novo Jogo';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

function confirmDeleteGame(id) {
    gameToDeleteId = id;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

async function closeConfirmModal(confirmed) {
    if (confirmed && gameToDeleteId) {
        const { error } = await StorageService.deleteGame(gameToDeleteId);
        if (!error) {
            showToast('Jogo eliminado com sucesso.');
            await loadData();
        } else {
            showToast('Erro ao eliminar jogo do Supabase.');
        }
    }

    gameToDeleteId = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}
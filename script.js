'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & DOM ELEMENTS ---
    let state = {
        uploadedFile: null,
        frames: [],
        isAuthenticated: false,
    };
    const getEl = (id) => document.getElementById(id);
    const dom = {
        uploadZone: getEl('uploadZone'),
        fileInput: getEl('fileInput'),
        uploadedImage: getEl('uploadedImage'),
        previewSection: getEl('previewSection'),
        canvas: getEl('canvas'),
        downloadBtn: getEl('downloadBtn'),
        resetBtn: getEl('resetBtn'),
        adminAccessBtn: getEl('adminAccessBtn'),
        adminModal: getEl('adminModal'),
        adminLoginForm: getEl('adminLoginForm'),
        adminPasswordInput: getEl('adminPasswordInput'),
        adminCancelBtn: getEl('adminCancelBtn'),
        adminPanel: getEl('adminPanel'),
        adminCloseBtn: getEl('adminCloseBtn'),
        adminStatus: getEl('adminStatus'),
        frameManagementGrid: getEl('frameManagementGrid'),
    };

    // --- MOCK API & DATA ---
    const api = {
        login: (password) => new Promise((resolve, reject) => { setTimeout(() => { if (password === 'goshapica2024') { state.isAuthenticated = true; resolve(true); } else { reject(new Error('Incorrect password.')); } }, 300); }),
        getFrames: () => new Promise((resolve) => {
            const frames = JSON.parse(localStorage.getItem('goshapica_frames')) || [
                { id: 'classic-wood', name: 'Classic Wood', url: 'https://i.postimg.cc/kXqJgB6d/classic-wood.png', isActive: true },
                { id: 'modern-black', name: 'Modern Black', url: 'https://i.postimg.cc/t4gB4qB5/modern-black.png', isActive: false },
                { id: 'ornate-gold', name: 'Ornate Gold', url: 'https://i.postimg.cc/k43vLg1J/ornate-gold.png', isActive: false },
            ];
            if (!localStorage.getItem('goshapica_frames')) localStorage.setItem('goshapica_frames', JSON.stringify(frames));
            state.frames = frames;
            resolve(frames);
        }),
        activateFrame: (frameIdToActivate) => new Promise((resolve) => {
            state.frames.forEach(frame => { frame.isActive = (frame.id === frameIdToActivate); });
            localStorage.setItem('goshapica_frames', JSON.stringify(state.frames));
            resolve();
        }),
    };

    // --- UI LOGIC ---
    const ui = {
        toggleModal: (modal, show) => { if (modal) { modal.style.opacity = show ? '1' : '0'; modal.style.display = show ? 'flex' : 'none'; if(show) modal.querySelector('input, button')?.focus(); } },
        renderStatus: (container, message, type = 'success') => { if (container) container.innerHTML = `<div class="status status--${type}">${message}</div>`; },
        renderAdminFrames: () => {
            const grid = dom.frameManagementGrid, template = getEl('adminFrameCardTemplate');
            if(!grid || !template) return;
            grid.innerHTML = '';
            state.frames.forEach(frame => {
                const cardNode = template.content.cloneNode(true);
                const cardElement = cardNode.querySelector('.admin-frame-card'), statusDot = cardNode.querySelector('.admin-frame-card__status'), activateBtn = cardNode.querySelector('.admin-frame-card__activate-btn');
                cardElement.dataset.frameId = frame.id;
                cardElement.classList.toggle('is-active', frame.isActive);
                statusDot.classList.toggle('is-active', frame.isActive);
                cardNode.querySelector('.admin-frame-card__name').textContent = frame.name;
                cardNode.querySelector('.admin-frame-card__img').src = frame.url;
                if (activateBtn) activateBtn.disabled = frame.isActive;
                grid.appendChild(cardNode);
            });
        }
    };

    // --- CORE LOGIC ---
    const drawCanvas = async () => {
        if (!state.uploadedFile) return;
        const activeFrame = state.frames.find(f => f.isActive);
        if (!activeFrame) { alert('Error: No active frame found!'); return; }
        dom.previewSection.style.display = 'block';
        try {
            const userImgPromise = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dom.uploadedImage.src; });
            const frameImgPromise = new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.onerror = reject; img.src = activeFrame.url; });
            const [userImg, frameImg] = await Promise.all([userImgPromise, frameImgPromise]);
            const ctx = dom.canvas.getContext('2d');
            dom.canvas.width = frameImg.naturalWidth; dom.canvas.height = frameImg.naturalHeight;
            ctx.drawImage(userImg, 0, 0, dom.canvas.width, dom.canvas.height);
            ctx.drawImage(frameImg, 0, 0, dom.canvas.width, dom.canvas.height);
            dom.downloadBtn.disabled = false;
        } catch (error) { console.error("Canvas Error:", error); alert('Error applying frame.'); }
    };

    const handleFileUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) { alert('Please select a valid image file.'); return; }
        state.uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { dom.uploadedImage.src = e.target.result; dom.uploadedImage.style.display = 'block'; drawCanvas(); };
        reader.readAsDataURL(file);
    };

    const resetApp = () => {
        state.uploadedFile = null;
        dom.uploadedImage.src = ''; dom.uploadedImage.style.display = 'none';
        dom.previewSection.style.display = 'none';
        dom.downloadBtn.disabled = true;
        dom.fileInput.value = '';
    };

    const handleActivateFrame = async (frameId) => {
        await api.activateFrame(frameId);
        await api.getFrames();
        ui.renderAdminFrames();
        const activeFrameName = state.frames.find(f => f.isActive)?.name || 'Unknown';
        ui.renderStatus(dom.adminStatus, `"${activeFrameName}" is now the Frame of the Day.`, 'success');
    };
    
    // --- EVENT LISTENERS ---
    // User-facing listeners
    dom.uploadZone.addEventListener('click', () => dom.fileInput.click());
    dom.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.uploadZone.classList.add('dragover'); });
    dom.uploadZone.addEventListener('dragleave', () => dom.uploadZone.classList.remove('dragover'));
    dom.uploadZone.addEventListener('drop', (e) => { e.preventDefault(); dom.uploadZone.classList.remove('dragover'); if (e.dataTransfer.files[0]) { handleFileUpload(e.dataTransfer.files[0]); } });
    
    // THIS LISTENER WAS MISSING
    dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    });

    dom.downloadBtn.addEventListener('click', () => { dom.canvas.toBlob((blob) => { const link = document.createElement('a'); link.download = `GoShaPica_FrameOfTheDay.png`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); }, 'image/png'); });
    dom.resetBtn.addEventListener('click', resetApp);

    // Admin-related listeners
    dom.adminAccessBtn.addEventListener('click', () => ui.toggleModal(dom.adminModal, true));
    dom.adminCancelBtn.addEventListener('click', () => ui.toggleModal(dom.adminModal, false));
    dom.adminCloseBtn.addEventListener('click', () => ui.toggleModal(dom.adminPanel, false));
    dom.adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await api.login(dom.adminPasswordInput.value);
            ui.toggleModal(dom.adminModal, false);
            ui.toggleModal(dom.adminPanel, true);
            ui.renderAdminFrames();
        } catch (error) {
            alert(error.message);
        } finally {
            dom.adminPasswordInput.value = '';
        }
    });
    dom.frameManagementGrid.addEventListener('click', async (e) => {
        const activateBtn = e.target.closest('.admin-frame-card__activate-btn');
        if (activateBtn) {
            const card = e.target.closest('.admin-frame-card');
            await handleActivateFrame(card.dataset.frameId);
        }
    });

    // --- INITIALIZATION ---
    api.getFrames();
});
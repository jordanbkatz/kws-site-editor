
// State
const state = {
    activeSection: 'media', // 'media', 'reviews', 'colors'
    reviews: [], // Array of review objects
    colors: {
        a1: '#4169e1', // royalblue
        a2: '#dc143c', // crimson
        b1: '#f6f2ed',
        b2: '#fbf9f7',
        b1Mix: 95,
        b2Mix: 98,
        b1Mode: 'lighten', // 'lighten' or 'manual'
        b2Mode: 'manual'
    },
    tagHierarchy: {
        sections: {
            'Logo': { type: 'singleton', allowCategories: false },
            'Hero': { type: 'singleton', allowCategories: false },
            'About': { type: 'singleton', allowCategories: false },
            'Events': { type: 'multi', allowCategories: false },
            'Gallery': {
                type: 'multi',
                allowCategories: true,
                categories: {
                    'Main': [] // Array of subcategories
                }
            },
            'Products': {
                type: 'multi',
                allowCategories: true,
                categories: {
                    'Main': []
                }
            }
        }
    },
    images: [], // { id, url, file, section, category, subcategory, mode: 'auto'|'manual', scale: 1, x: 0, y: 0, productDetails: {}, eventDetails: {} }
    siteData: null,
    deleteMode: false,
    activeDrag: null, // { id, startX, startY, initialX, initialY }
    tagStartNumbers: {}, // { tagName: number }
    reviewDeleteConfirmIndex: null
};

// DOM Elements
const elements = {
    imageInput: document.getElementById('imageInput'),
    downloadBtn: document.getElementById('downloadBtn'),
    clearBtn: document.getElementById('clearBtn'),
    imageGrid: document.getElementById('imageGrid'),

    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    sections: {
        media: document.getElementById('media-section'),
        reviews: document.getElementById('reviews-section'),
        colors: document.getElementById('colors-section')
    },
    // Reviews
    reviewsGrid: document.getElementById('reviewsGrid'),
    addReviewBtn: document.getElementById('addReviewBtn'),
    // Colors
    colorsGrid: document.getElementById('colorsGrid'),
    // Tag Management
    tagTypeSelect: document.getElementById('tagTypeSelect'),
    tagSectionSelect: document.getElementById('tagSectionSelect'),
    tagParentCategorySelect: document.getElementById('tagParentCategorySelect'),
    parentCategoryGroup: document.getElementById('parentCategoryGroup'),
    newTagNameInput: document.getElementById('newTagNameInput'),
    addNewTagBtn: document.getElementById('addNewTagBtn'),
    existingTagsList: document.getElementById('existingTagsList')
};

// Initialization
function init() {
    setupEventListeners();
    updateTagManagementUI();
    renderTagHierarchy();
    renderGrid();
}

function setupEventListeners() {
    // File Inputs
    elements.imageInput.addEventListener('change', handleImageUpload);
    elements.downloadBtn.addEventListener('click', downloadImages);
    elements.clearBtn.addEventListener('click', handleClearAll);

    // Navigation
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabSwitch(tab.dataset.section));
    });

    // Reviews
    elements.addReviewBtn.addEventListener('click', handleAddReview);

    // Tag Management
    elements.addNewTagBtn.addEventListener('click', handleAddNewTag);
    elements.tagTypeSelect.addEventListener('change', updateTagManagementUI);
    elements.tagSectionSelect.addEventListener('change', updateTagManagementUI);

    // Global Drag Events
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
}

// Navigation Logic
function handleTabSwitch(sectionName) {
    state.activeSection = sectionName;

    // Update Tabs
    elements.navTabs.forEach(tab => {
        if (tab.dataset.section === sectionName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update Sections
    Object.keys(elements.sections).forEach(key => {
        if (key === sectionName) {
            elements.sections[key].style.display = 'block';
            if (key === 'media') {
                elements.sections[key].classList.add('active');
            }
        } else {
            elements.sections[key].style.display = 'none';
            elements.sections[key].classList.remove('active');
        }
    });

    if (sectionName === 'reviews') {
        renderReviews();
    } else if (sectionName === 'colors') {
        renderColors();
    }
}

// Handlers
function handleClearAll() {
    if (confirm('Are you sure you want to clear all files and reset tags? This action cannot be undone.')) {
        // Reset State
        state.tagHierarchy = {
            sections: {
                'Logo': { type: 'singleton', allowCategories: false },
                'Hero': { type: 'singleton', allowCategories: false },
                'About': { type: 'singleton', allowCategories: false },
                'Events': { type: 'multi', allowCategories: false },
                'Gallery': {
                    type: 'multi',
                    allowCategories: true,
                    categories: {
                        'Main': []
                    }
                },
                'Products': {
                    type: 'multi',
                    allowCategories: true,
                    categories: {
                        'Main': []
                    }
                }
            }
        };
        state.images = [];
        state.reviews = [];
        state.siteData = null;
        state.activeDrag = null;
        state.tagStartNumbers = {};

        // Reset Inputs
        elements.imageInput.value = '';
        elements.newTagNameInput.value = '';

        // Re-render
        updateTagManagementUI();
        renderTagHierarchy();
        renderGrid();
    }
}

function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Separate JSON and Image files
    const jsonFile = files.find(f => f.type === 'application/json' || f.name.endsWith('.json'));
    const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (jsonFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                state.siteData = JSON.parse(e.target.result);
                console.log('Site data loaded:', state.siteData);

                // Initialize Reviews
                if (state.siteData.reviews && state.siteData.reviews.list) {
                    state.reviews = [...state.siteData.reviews.list];
                    renderReviews();
                }
            } catch (err) {
                console.error('Error parsing JSON:', err);
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(jsonFile);
    }

    const newMedia = mediaFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        file: file, // Store original file for download
        type: file.type.startsWith('video/') ? 'video' : 'image',
        extension: file.name.split('.').pop(),
        section: 'Gallery',
        category: 'Main',
        subcategory: null,
        mode: 'auto',
        scale: 1,
        x: 0,
        y: 0,
        productDetails: {
            name: '',
            value: '',
            description: ''
        },
        eventDetails: {
            name: '',
            description: '',
            announce: false,
            durationType: 'list', // 'range' | 'list'
            range: { start: '', end: '' },
            dates: [] // { date: '', time: '', closed: false }
        }
    }));

    state.images = [...state.images, ...newMedia];
    renderGrid();
}

function updateTagManagementUI() {
    const type = elements.tagTypeSelect.value;
    const section = elements.tagSectionSelect.value;

    // Show/Hide Parent Category Select
    if (type === 'subcategory') {
        elements.parentCategoryGroup.style.display = 'block';

        // Populate Parent Categories
        elements.tagParentCategorySelect.innerHTML = '';
        const categories = state.tagHierarchy.sections[section].categories;

        if (categories) {
            Object.keys(categories).forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                elements.tagParentCategorySelect.appendChild(option);
            });
        }
    } else {
        elements.parentCategoryGroup.style.display = 'none';
    }
}

function handleAddNewTag() {
    const type = elements.tagTypeSelect.value;
    const section = elements.tagSectionSelect.value;
    const name = elements.newTagNameInput.value.trim();

    if (!name) return;

    const sectionData = state.tagHierarchy.sections[section];

    if (type === 'category') {
        if (sectionData.categories[name]) {
            alert('Category already exists!');
            return;
        }
        sectionData.categories[name] = []; // Initialize with empty subcategories
    } else {
        const parentCategory = elements.tagParentCategorySelect.value;
        if (!parentCategory) {
            alert('Please select a parent category');
            return;
        }
        if (sectionData.categories[parentCategory].includes(name)) {
            alert('Subcategory already exists!');
            return;
        }
        sectionData.categories[parentCategory].push(name);
    }

    elements.newTagNameInput.value = '';
    updateTagManagementUI();
    renderTagHierarchy();
    renderGrid(); // Re-render grid to update dropdowns
}

function deleteCategory(section, category) {
    if (confirm(`Delete category "${category}" and all its subcategories ? `)) {
        delete state.tagHierarchy.sections[section].categories[category];

        // Clean up images
        state.images.forEach(img => {
            if (img.section === section && img.category === category) {
                // Fallback to Main if it exists and we didn't just delete it, otherwise null
                if (state.tagHierarchy.sections[section].categories['Main']) {
                    img.category = 'Main';
                } else {
                    img.category = null;
                }
                img.subcategory = null;
            }
        });

        updateTagManagementUI();
        renderTagHierarchy();
        renderGrid();
    }
}

function deleteSubcategory(section, category, subcategory) {
    if (confirm(`Delete subcategory "${subcategory}" ? `)) {
        const subcats = state.tagHierarchy.sections[section].categories[category];
        const index = subcats.indexOf(subcategory);
        if (index > -1) {
            subcats.splice(index, 1);
        }

        // Clean up images
        state.images.forEach(img => {
            if (img.section === section && img.category === category && img.subcategory === subcategory) {
                img.subcategory = null;
            }
        });

        renderTagHierarchy();
        renderGrid();
    }
}

function renderTagHierarchy() {
    elements.existingTagsList.innerHTML = '';
    const sections = ['Gallery', 'Products'];

    sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section-tags-group';

        const title = document.createElement('h5');
        title.textContent = section;
        sectionDiv.appendChild(title);

        const treeDiv = document.createElement('div');
        treeDiv.className = 'tags-tree';

        const categories = state.tagHierarchy.sections[section].categories;
        Object.keys(categories).forEach(cat => {
            const catItem = document.createElement('div');
            catItem.className = 'category-item';

            // Category Header
            const header = document.createElement('div');
            header.className = 'category-header';

            const deleteBtn = `<button class="delete-btn-small" onclick="deleteCategory('${section}', '${cat}')" title="Delete Category">✕</button>`;

            header.innerHTML = `
                <span class="category-name">${cat}</span>
                ${deleteBtn}
            `;
            catItem.appendChild(header);

            // Subcategories
            const subcats = categories[cat];
            if (subcats.length > 0) {
                const subList = document.createElement('div');
                subList.className = 'subcategories-list';
                subcats.forEach(sub => {
                    const subChip = document.createElement('div');
                    subChip.className = 'subcategory-chip';
                    subChip.innerHTML = `
                        <span>${sub}</span>
                        <button onclick="deleteSubcategory('${section}', '${cat}', '${sub}')">×</button>
                    `;
                    subList.appendChild(subChip);
                });
                catItem.appendChild(subList);
            } else {
                const emptySub = document.createElement('div');
                emptySub.style.fontSize = '0.85rem';
                emptySub.style.color = 'var(--text-secondary)';
                emptySub.style.paddingLeft = '1rem';
                emptySub.textContent = 'No subcategories';
                catItem.appendChild(emptySub);
            }

            treeDiv.appendChild(catItem);
        });

        if (treeDiv.children.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.style.color = 'var(--text-secondary)';
            emptyMsg.style.fontSize = '0.9rem';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.textContent = 'No custom categories.';
            treeDiv.appendChild(emptyMsg);
        }

        sectionDiv.appendChild(treeDiv);
        elements.existingTagsList.appendChild(sectionDiv);
    });
}

function updateImageTags(imageId, type, value) {
    const image = state.images.find(img => img.id === imageId);
    if (!image) return;

    const oldSection = image.section;

    if (type === 'section') {
        const newSection = value;
        const sectionData = state.tagHierarchy.sections[newSection];

        // Singleton Check
        if (sectionData.type === 'singleton') {
            const existingOwner = state.images.find(img => img.section === newSection && img.id !== imageId);
            if (existingOwner) {
                // Reset the previous owner to default
                existingOwner.section = 'Gallery';
                existingOwner.category = 'Main';
                existingOwner.subcategory = null;
                existingOwner.mode = 'auto'; // Reset mode
            }
            // Set mode to manual for singletons
            image.mode = 'manual';
        } else if (oldSection !== newSection) {
            // Reset mode if moving away from singleton (optional, but good for UX)
            if (state.tagHierarchy.sections[oldSection].type === 'singleton') {
                image.mode = 'auto';
                image.scale = 1;
                image.x = 0;
                image.y = 0;
            }
        }

        image.section = newSection;

        // Set Defaults for new section
        if (sectionData.allowCategories) {
            image.category = 'Main';
            image.subcategory = null;
        } else {
            image.category = null;
            image.subcategory = null;
        }

        // Initialize details if missing
        if (newSection === 'Products' && !image.productDetails) {
            image.productDetails = { name: '', value: '', description: '' };
        }
        if (newSection === 'Events' && !image.eventDetails) {
            image.eventDetails = {
                name: '',
                description: '',
                announce: false,
                durationType: 'range',
                range: { start: '', end: '' },
                dates: []
            };
        }

    } else if (type === 'category') {
        image.category = value;
        image.subcategory = null; // Reset subcategory when category changes
    } else if (type === 'subcategory') {
        image.subcategory = value;
    }

    renderGrid();
}

function deleteImage(id) {
    if (confirm('Are you sure you want to delete this image?')) {
        state.images = state.images.filter(img => img.id !== id);
        renderGrid();
    }
}

// Data Update Handlers
function updateProductDetails(id, field, value) {
    const image = state.images.find(img => img.id === id);
    if (image && image.productDetails) {
        image.productDetails[field] = value;
    }
}

function updateEventDetails(id, field, value) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails) {
        image.eventDetails[field] = value;
    }
}

function toggleEventDurationType(id) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails) {
        image.eventDetails.durationType = image.eventDetails.durationType === 'range' ? 'list' : 'range';
        renderGrid();
    }
}

function updateEventRange(id, field, value) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails) {
        image.eventDetails.range[field] = value;
    }
}

function addEventDate(id) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails) {
        image.eventDetails.dates.push({ date: '', time: '', closed: false });
        renderGrid();
    }
}

function removeEventDate(id, index) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails) {
        image.eventDetails.dates.splice(index, 1);
        renderGrid();
    }
}

function updateEventDate(id, index, field, value) {
    const image = state.images.find(img => img.id === id);
    if (image && image.eventDetails && image.eventDetails.dates[index]) {
        image.eventDetails.dates[index][field] = value;
    }
}


// Reviews Logic
function renderReviews() {
    elements.reviewsGrid.innerHTML = '';

    state.reviews.forEach((review, index) => {
        const card = document.createElement('div');
        card.className = 'review-card';

        card.innerHTML = `
            <div class="review-card-header">
                <span class="review-index">#${index + 1}</span>
                <div class="review-controls">
                    <button class="review-btn" onclick="moveReview(${index}, -1)" title="Move Up" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="review-btn" onclick="moveReview(${index}, 1)" title="Move Down" ${index === state.reviews.length - 1 ? 'disabled' : ''}>↓</button>
                    ${state.reviewDeleteConfirmIndex === index ?
                `<button class="review-btn" onclick="cancelDeleteReview(${index})" title="Cancel Delete" style="width: auto; padding: 0 0.5rem; margin-right: 0.25rem;">Cancel</button>`
                : ''
            }
                    <button class="review-btn delete ${state.reviewDeleteConfirmIndex === index ? 'confirm-delete' : ''}" 
                            onclick="deleteReview(${index})" 
                            title="Delete Review"
                            style="${state.reviewDeleteConfirmIndex === index ? 'background-color: #dc143c; color: white; width: auto; padding: 0 0.5rem;' : ''}">
                        ${state.reviewDeleteConfirmIndex === index ? 'Confirm' : '✕'}
                    </button>
                </div>
            </div>
            
            <div class="review-input-group">
                <label>Rating (1-5)</label>
                <input type="number" min="1" max="5" value="${review.rating}" onchange="updateReview(${index}, 'rating', this.value)">
            </div>
            
            <div class="review-input-group">
                <label>Name</label>
                <input type="text" value="${review.name}" onchange="updateReview(${index}, 'name', this.value)" placeholder="Reviewer Name">
            </div>
            
            <div class="review-input-group">
                <label>Review Text</label>
                <textarea id="review-textarea-${index}" onchange="updateReview(${index}, 'review', this.value)" oninput="autoResizeTextarea(this)" placeholder="Review content...">${review.review}</textarea>
            </div>
`;

        elements.reviewsGrid.appendChild(card);

        // Auto-resize the textarea after it's added to DOM
        const textarea = document.getElementById(`review-textarea-${index}`);
        if (textarea) {
            autoResizeTextarea(textarea);
        }
    });
}

function handleAddReview() {
    state.reviews.push({
        rating: 5,
        name: '',
        review: ''
    });
    renderReviews();
}

function deleteReview(index) {
    // Save scroll position
    const scrollPos = window.scrollY;

    if (state.reviewDeleteConfirmIndex === index) {
        state.reviews.splice(index, 1);
        state.reviewDeleteConfirmIndex = null;
        renderReviews();
    } else {
        state.reviewDeleteConfirmIndex = index;
        renderReviews();
    }

    // Restore scroll position
    window.scrollTo(0, scrollPos);
}

function cancelDeleteReview(index) {
    // Save scroll position
    const scrollPos = window.scrollY;

    state.reviewDeleteConfirmIndex = null;
    renderReviews();

    // Restore scroll position
    window.scrollTo(0, scrollPos);
}

function updateReview(index, field, value) {
    if (state.reviews[index]) {
        if (field === 'rating') {
            value = parseInt(value);
            if (value < 1) value = 1;
            if (value > 5) value = 5;
        }
        state.reviews[index][field] = value;
    }
}

function moveReview(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < state.reviews.length) {
        // Save scroll position
        const scrollPos = window.scrollY;

        const temp = state.reviews[index];
        state.reviews[index] = state.reviews[newIndex];
        state.reviews[newIndex] = temp;
        renderReviews();

        // Restore scroll position
        window.scrollTo(0, scrollPos);
    }
}

function autoResizeTextarea(textarea) {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight to show all content
    textarea.style.height = textarea.scrollHeight + 'px';
}

// Grid Rendering (No Pagination)
function renderGrid() {
    elements.imageGrid.innerHTML = '';

    if (state.images.length === 0) {
        elements.imageGrid.innerHTML = `
            <div class="empty-state">
                <h3>No media uploaded</h3>
                <p>Upload media files to get started</p>
            </div>
    `;
        return;
    }

    state.images.forEach(img => {
        const card = document.createElement('div');
        card.className = 'image-card';

        // Determine aspect ratio class
        let ratioClass = '';
        if (img.section === 'About') ratioClass = 'ratio-about';

        // Determine mode class
        const modeClass = img.mode === 'manual' ? 'manual' : '';

        // Generate Tag Selectors
        const tagSelectors = generateTagSelectors(img);

        // Generate Specific Inputs
        const specificInputs = generateSpecificInputs(img);

        // Media Element Logic
        let mediaElement = '';
        let editControls = '';

        if (img.type === 'video') {
            mediaElement = `
                <video 
                    src="${img.url}" 
                    controls 
                    style="width: 100%; height: 100%; object-fit: contain;"
                ></video>
            `;
            // Only show delete button for videos
            editControls = `
                <div class="edit-controls" style="justify-content: flex-end; display: flex;">
                    <button class="delete-card-btn" onclick="deleteImage('${img.id}')" title="Delete Video">✕</button>
                </div>
            `;
        } else {
            mediaElement = `
                <img 
                    src="${img.url}" 
                    id="img-${img.id}" 
                    style="transform: translate(${img.x}px, ${img.y}px) scale(${img.scale})"
                    draggable="false"
                >
            `;

            editControls = `
                <div class="edit-controls">
                    <div class="mode-toggle">
                        <span>Mode: ${img.mode === 'manual' ? 'Manual' : 'Auto'}</span>
                        <label class="switch">
                            <input type="checkbox" ${img.mode === 'manual' ? 'checked' : ''} onchange="toggleImageMode('${img.id}')">
                            <span class="slider"></span>
                        </label>
                        <button class="delete-card-btn" onclick="deleteImage('${img.id}')" title="Delete Image">✕</button>
                    </div>
                    <div class="zoom-control ${img.mode === 'manual' ? 'active' : ''}">
                        <span>Zoom:</span>
                        <input type="range" min="0.1" max="3" step="0.1" value="${img.scale}" oninput="updateImageZoom('${img.id}', this.value)">
                        <span id="zoom-value-${img.id}">${img.scale}x</span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="image-container ${ratioClass} ${modeClass}" 
                 id="img-container-${img.id}"
                 onmousedown="${img.type === 'image' ? `startDrag(event, '${img.id}')` : ''}">
                ${mediaElement}
            </div>
            <div class="card-controls">
                ${editControls}
                ${tagSelectors}
                ${specificInputs}
            </div>
`;
        elements.imageGrid.appendChild(card);
    });
}

function generateTagSelectors(img) {
    // Section Selector
    let html = `
        <div class="tag-selector-group">
            <div class="selector-row">
                <label>Section</label>
                <div class="button-group">
    `;

    Object.keys(state.tagHierarchy.sections).forEach(sec => {
        const active = img.section === sec ? 'active' : '';
        html += `<button class="selector-btn ${active}" onclick="updateImageTags('${img.id}', 'section', '${sec}')">${sec}</button>`;
    });

    html += `</div></div>`;

    const sectionData = state.tagHierarchy.sections[img.section];

    // Category Selector
    if (sectionData.allowCategories && sectionData.categories) {
        html += `
            <div class="selector-row">
                <label>Category</label>
                <div class="button-group">
        `;
        Object.keys(sectionData.categories).forEach(cat => {
            const active = img.category === cat ? 'active' : '';
            html += `<button class="selector-btn ${active}" onclick="updateImageTags('${img.id}', 'category', '${cat}')">${cat}</button>`;
        });
        html += `</div></div>`;

        // Subcategory Selector
        if (img.category && sectionData.categories[img.category].length > 0) {
            html += `
            <div class="selector-row">
                <label>Subcategory</label>
                <div class="button-group">
            `;
            sectionData.categories[img.category].forEach(sub => {
                const active = img.subcategory === sub ? 'active' : '';
                html += `<button class="selector-btn ${active}" onclick="updateImageTags('${img.id}', 'subcategory', '${sub}')">${sub}</button>`;
            });
            html += `</div></div>`;
        }
    }

    html += `</div>`;
    return html;
}

function generateSpecificInputs(img) {
    if (img.section === 'Products') {
        return `
            <div class="specific-inputs">
                <div class="input-group">
                    <input type="text" placeholder="Product Name" value="${img.productDetails.name}" onchange="updateProductDetails('${img.id}', 'name', this.value)">
                </div>
                <div class="input-group">
                    <input type="number" placeholder="Value ($)" value="${img.productDetails.value}" onchange="updateProductDetails('${img.id}', 'value', this.value)">
                </div>
                <div class="input-group">
                    <textarea placeholder="Description" onchange="updateProductDetails('${img.id}', 'description', this.value)">${img.productDetails.description}</textarea>
                </div>
            </div>
        `;
    } else if (img.section === 'Events') {
        const isRange = img.eventDetails.durationType === 'range';

        let durationHtml = '';
        if (isRange) {
            durationHtml = `
                <div class="duration-range">
                    <div class="form-group">
                        <label>Start</label>
                        <input type="date" value="${img.eventDetails.range.start}" onchange="updateEventRange('${img.id}', 'start', this.value)">
                    </div>
                    <div class="form-group">
                        <label>End</label>
                        <input type="date" value="${img.eventDetails.range.end}" onchange="updateEventRange('${img.id}', 'end', this.value)">
                    </div>
                </div>
            `;
        } else {
            let datesHtml = '';
            img.eventDetails.dates.forEach((dateObj, idx) => {
                datesHtml += `
                    <div class="date-list-item">
                        <div class="date-row">
                            <input type="date" value="${dateObj.date}" onchange="updateEventDate('${img.id}', ${idx}, 'date', this.value)">
                            <button class="delete-btn-small" onclick="removeEventDate('${img.id}', ${idx})">✕</button>
                        </div>
                        <div class="date-row">
                            <input type="text" placeholder="Time (e.g. 10am - 5pm)" value="${dateObj.time}" onchange="updateEventDate('${img.id}', ${idx}, 'time', this.value)" ${dateObj.closed ? 'disabled' : ''}>
                            <label class="checkbox-label">
                                <input type="checkbox" ${dateObj.closed ? 'checked' : ''} onchange="updateEventDate('${img.id}', ${idx}, 'closed', this.checked)">
                                Closed
                            </label>
                        </div>
                    </div>
                `;
            });

            durationHtml = `
                <div class="duration-list">
                    ${datesHtml}
                    <button class="btn-small-add" onclick="addEventDate('${img.id}')">+ Add Date</button>
                </div>
            `;
        }

        return `
            <div class="specific-inputs">
                <div class="input-group">
                    <input type="text" placeholder="Event Name" value="${img.eventDetails.name}" onchange="updateEventDetails('${img.id}', 'name', this.value)">
                </div>
                <div class="input-group">
                    <textarea placeholder="Description" onchange="updateEventDetails('${img.id}', 'description', this.value)">${img.eventDetails.description}</textarea>
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" ${img.eventDetails.announce ? 'checked' : ''} onchange="updateEventDetails('${img.id}', 'announce', this.checked)">
                        Announce
                    </label>
                </div>
                
                <div class="duration-section">
                    <div class="duration-header">
                        <label>Duration</label>
                        <button class="toggle-btn" onclick="toggleEventDurationType('${img.id}')">
                            Switch to ${isRange ? 'List' : 'Range'}
                        </button>
                    </div>
                    ${durationHtml}
                </div>
            </div>
        `;
    }
    return '';
}

// Drag Logic
function handleDragMove(e) {
    if (!state.activeDrag) return;

    const { id, startX, startY, initialX, initialY } = state.activeDrag;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const image = state.images.find(img => img.id === id);
    if (image) {
        // We need to account for scaleFactor if we want 1:1 pixel movement
        // But for now, let's just update raw values and let render handle it
        // Actually, renderGrid re-renders everything which is slow for drag.
        // Better to update DOM directly for performance.

        // However, our state stores 'x' and 'y' which are used in render.
        // Let's update state AND DOM.

        const domImg = document.getElementById(`img-${id}`);
        const domContainer = domImg ? domImg.parentElement : null;

        if (domContainer) {
            // Calculate scale factor relative to rendered size
            // This is tricky because we don't know the exact rendered size in pixels easily without querying DOM
            // But we can just use the delta directly if we assume 1 screen pixel = 1 translation unit
            // The canvas logic in download uses a different coordinate system potentially.
            // In downloadImages: translateX = img.x * scaleFactor
            // So img.x should be in "screen pixels" relative to the container size?
            // Let's assume img.x/y are in pixels relative to the image's natural size or container?
            // The previous implementation seemed to treat x/y as direct translation values.

            // Let's just update x/y by delta.
            image.x = initialX + dx;
            image.y = initialY + dy;

            updateImageTransform(id);
        }
    }
}

function handleDragEnd() {
    state.activeDrag = null;
}

function updateImageTransform(id) {
    const image = state.images.find(img => img.id === id);
    const domImg = document.getElementById(`img-${id}`);
    if (image && domImg) {
        domImg.style.transform = `translate(${image.x}px, ${image.y}px) scale(${image.scale})`;
    }
}

async function downloadImages() {
    if (state.images.length === 0 && !state.siteData) {
        alert('No files to download!');
        return;
    }

    // Sync Reviews to Site Data
    if (state.siteData) {
        if (!state.siteData.reviews) state.siteData.reviews = {};
        state.siteData.reviews.list = state.reviews;

        // Sync Colors to Site Data
        if (!state.siteData.styles) state.siteData.styles = {};
        state.siteData.styles.a1 = state.colors.a1;
        state.siteData.styles.a2 = state.colors.a2;
        state.siteData.styles.b1 = state.colors.b1;
        state.siteData.styles.b2 = state.colors.b2;
    }

    // 1. Initialize Counters from Site Data
    const counters = {}; // Key: "Section-Category-Subcategory" (or similar) -> Current Max Index

    if (state.siteData) {
        // Gallery Counters
        if (state.siteData.gallery && state.siteData.gallery.categories) {
            state.siteData.gallery.categories.forEach(cat => {
                const indices = cat.items.map(item => {
                    const match = item.match(/(\d+)\.(webp|mov|mp4|webm|m4v)$/i);
                    return match ? parseInt(match[1]) : 0;
                });
                const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
                counters[`Gallery-${cat.name}`] = maxIndex;
            });
        }

        // Products Counters
        if (state.siteData.products && state.siteData.products.categories) {
            state.siteData.products.categories.forEach(cat => {
                if (cat.subcategories) {
                    cat.subcategories.forEach(sub => {
                        const indices = sub.items.map(item => {
                            // Check if img is a number or string number
                            const val = parseInt(item.img);
                            return isNaN(val) ? 0 : val;
                        });
                        const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
                        counters[`Products-${cat.name}-${sub.name}`] = maxIndex;
                    });
                }
            });
        }

        // Events Counters
        if (state.siteData.events && state.siteData.events.list) {
            const indices = state.siteData.events.list.map(evt => {
                let val = 0;
                if (typeof evt.media === 'string') {
                    const match = evt.media.match(/(\d+)\.(webp|mov|mp4|webm|m4v)$/i);
                    val = match ? parseInt(match[1]) : 0;
                } else if (evt.media && evt.media.path) {
                    const match = evt.media.path.match(/(\d+)(\.(webp|mov|mp4|webm|m4v))?$/i);
                    val = match ? parseInt(match[1]) : 0;
                    // Also check if path is just a number
                    if (!match && !isNaN(parseInt(evt.media.path))) {
                        val = parseInt(evt.media.path);
                    }
                }
                return val;
            });
            const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
            counters['Events'] = maxIndex;
        }
    }

    // 2. Process Images and Update JSON
    const filesToDownload = [];

    for (const img of state.images) {
        let filename = '';
        const sectionData = state.tagHierarchy.sections[img.section];

        // Determine extension
        // If it's a video, use original extension. If image, we convert to webp.
        const ext = img.type === 'video' ? `.${img.extension}` : '.webp';

        if (sectionData.type === 'singleton') {
            filename = `${img.section}${ext}`;
            // No JSON update needed for singletons (usually)
        } else {
            // Determine Key
            let key = img.section;
            if (img.category) key += `-${img.category}`;
            if (img.subcategory) key += `-${img.subcategory}`;

            // Initialize counter if not exists (e.g. new category)
            if (counters[key] === undefined) counters[key] = 0;

            // Increment
            counters[key]++;
            const newIndex = counters[key];

            filename = `${key}-${newIndex}${ext}`;

            // Update JSON
            if (state.siteData) {
                if (img.section === 'Gallery') {
                    let cat = state.siteData.gallery.categories.find(c => c.name === img.category);
                    if (!cat) {
                        cat = {
                            name: img.category,
                            dir: img.category.toLowerCase().replace(/\s+/g, '-'),
                            items: []
                        };
                        state.siteData.gallery.categories.push(cat);
                    }
                    cat.items.push(`${newIndex}${ext}`);
                }
                else if (img.section === 'Products') {
                    let cat = state.siteData.products.categories.find(c => c.name === img.category);
                    if (!cat) {
                        cat = {
                            name: img.category,
                            dir: img.category.toLowerCase().replace(/\s+/g, '-'),
                            subcategories: []
                        };
                        state.siteData.products.categories.push(cat);
                    }

                    let sub = cat.subcategories.find(s => s.name === img.subcategory);
                    if (!sub) {
                        sub = {
                            name: img.subcategory,
                            dir: img.subcategory.toLowerCase().replace(/\s+/g, '-'),
                            desc: "",
                            items: []
                        };
                        cat.subcategories.push(sub);
                    }

                    sub.items.push({
                        media: `${newIndex}${ext}`,
                        name: img.productDetails.name,
                        value: parseFloat(img.productDetails.value) || 0,
                        desc: img.productDetails.description
                    });
                }
                else if (img.section === 'Events') {
                    state.siteData.events.list.push({
                        media: `${newIndex}${ext}`,
                        name: img.eventDetails.name,
                        desc: img.eventDetails.description,
                        announce: img.eventDetails.announce,
                        duration: {
                            type: img.eventDetails.durationType,
                            range: img.eventDetails.range,
                            list: img.eventDetails.dates
                        }
                    });
                }
            }
        }

        // Prepare for download
        filesToDownload.push({
            filename,
            img
        });
    }

    // 3. Download JSON first (updated)
    if (state.siteData) {
        const jsonString = JSON.stringify(state.siteData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'siteData.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 4. Generate and Download Images
    for (const item of filesToDownload) {
        const { filename, img } = item;

        if (img.type === 'video') {
            // Download video file directly
            const url = URL.createObjectURL(img.file);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
        }

        // Load image first to get dimensions
        const imageObj = new Image();
        imageObj.src = img.url;
        await new Promise(resolve => {
            imageObj.onload = resolve;
        });

        // Determine target aspect ratio
        let aspectRatio = 11 / 9;
        if (img.section === 'About') aspectRatio = 14 / 9;

        // Calculate target dimensions based on original image size
        const imgRatio = imageObj.width / imageObj.height;
        let targetWidth, targetHeight;

        if (imgRatio > aspectRatio) {
            targetHeight = imageObj.height;
            targetWidth = Math.round(targetHeight * aspectRatio);
        } else {
            targetWidth = imageObj.width;
            targetHeight = Math.round(targetWidth / aspectRatio);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate draw dimensions
        const targetRatio = targetWidth / targetHeight;

        if (img.mode === 'auto') {
            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgRatio > targetRatio) {
                drawHeight = targetHeight;
                drawWidth = targetHeight * imgRatio;
                offsetY = 0;
                offsetX = (targetWidth - drawWidth) / 2;
            } else {
                drawWidth = targetWidth;
                drawHeight = targetWidth / imgRatio;
                offsetX = 0;
                offsetY = (targetHeight - drawHeight) / 2;
            }

            ctx.drawImage(imageObj, offsetX, offsetY, drawWidth, drawHeight);

        } else {
            let baseWidth, baseHeight;

            if (imgRatio > targetRatio) {
                baseWidth = targetWidth;
                baseHeight = targetWidth / imgRatio;
            } else {
                baseHeight = targetHeight;
                baseWidth = targetHeight * imgRatio;
            }

            const domImg = document.getElementById(`img-${img.id}`);
            const domContainer = domImg ? domImg.parentElement : null;

            let scaleFactor = 1;
            if (domContainer) {
                scaleFactor = targetWidth / domContainer.offsetWidth;
            }

            const translateX = img.x * scaleFactor;
            const translateY = img.y * scaleFactor;

            ctx.save();
            ctx.translate(targetWidth / 2, targetHeight / 2);
            ctx.translate(translateX, translateY);
            ctx.scale(img.scale, img.scale);
            ctx.drawImage(imageObj, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
            ctx.restore();
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.95));
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

// Per-Image Editing Logic
function toggleImageMode(id) {
    const image = state.images.find(img => img.id === id);
    if (!image) return;

    image.mode = image.mode === 'auto' ? 'manual' : 'auto';

    // Reset transform when switching to auto
    if (image.mode === 'auto') {
        image.scale = 1;
        image.x = 0;
        image.y = 0;
    }

    renderGrid();
}

function updateImageZoom(id, scale) {
    const image = state.images.find(img => img.id === id);
    if (!image) return;

    image.scale = parseFloat(scale);
    updateImageTransform(id);

    // Update zoom value display
    const zoomValueElement = document.getElementById(`zoom-value-${id}`);
    if (zoomValueElement) {
        zoomValueElement.textContent = `${image.scale}x`;
    }
}

function startDrag(e, id) {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();

    const image = state.images.find(img => img.id === id);
    if (!image || image.mode !== 'manual') return;

    state.activeDrag = {
        id: id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: image.x,
        initialY: image.y
    };
}

// Color Palette Logic
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function mixWithWhite(hex, percentage) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Mix with white (255, 255, 255)
    const mixAmount = percentage / 100;
    const r = Math.round(rgb.r + (255 - rgb.r) * mixAmount);
    const g = Math.round(rgb.g + (255 - rgb.g) * mixAmount);
    const b = Math.round(rgb.b + (255 - rgb.b) * mixAmount);

    return rgbToHex(r, g, b);
}

function normalizeColor(color) {
    if (!color) return '#000000';
    // Check for valid hex
    if (/^#[0-9A-F]{6}$/i.test(color)) return color;

    // Handle short hex #abc
    if (/^#[0-9A-F]{3}$/i.test(color)) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }

    // Handle named colors using a temporary element
    // This is necessary because <input type="color"> ONLY accepts hex
    const d = document.createElement('div');
    d.style.color = color;
    d.style.display = 'none';
    document.body.appendChild(d);
    const rgb = window.getComputedStyle(d).color;
    document.body.removeChild(d);

    // Parse rgb(r, g, b)
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
        return rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
    }

    return '#000000'; // Fallback
}

function renderColors() {
    // Load colors from siteData if available
    if (state.siteData && state.siteData.styles) {
        state.colors.a1 = state.siteData.styles.a1 || state.colors.a1;
        state.colors.a2 = state.siteData.styles.a2 || state.colors.a2;
        state.colors.b1 = state.siteData.styles.b1 || state.colors.b1;
        state.colors.b2 = state.siteData.styles.b2 || state.colors.b2;
    }

    // Normalize all colors to Hex for inputs
    state.colors.a1 = normalizeColor(state.colors.a1);
    state.colors.a2 = normalizeColor(state.colors.a2);
    state.colors.b1 = normalizeColor(state.colors.b1);
    state.colors.b2 = normalizeColor(state.colors.b2);

    elements.colorsGrid.innerHTML = `
        <div class="color-card">
            <h4>Accent 1 (a1)</h4>
            <div id="preview-a1" class="color-preview" style="background-color: ${state.colors.a1}"></div>
            <div class="color-input-group">
                <input id="input-color-a1" type="color" value="${state.colors.a1}" oninput="updateColor('a1', this.value)">
                <input id="input-text-a1" type="text" value="${state.colors.a1}" onchange="updateColor('a1', this.value)" placeholder="#000000">
            </div>
        </div>

        <div class="color-card">
            <h4>Accent 2 (a2)</h4>
            <div id="preview-a2" class="color-preview" style="background-color: ${state.colors.a2}"></div>
            <div class="color-input-group">
                <input id="input-color-a2" type="color" value="${state.colors.a2}" oninput="updateColor('a2', this.value)">
                <input id="input-text-a2" type="text" value="${state.colors.a2}" onchange="updateColor('a2', this.value)" placeholder="#000000">
            </div>
        </div>

        <div class="color-card">
            <h4>Background 1 (b1)</h4>
            <div id="preview-b1" class="color-preview" style="background-color: ${state.colors.b1}"></div>
            
            <div class="mode-toggle" style="margin-bottom: 1rem;">
                <span>Lighten from a1</span>
                <label class="switch">
                    <input type="checkbox" ${state.colors.b1Mode === 'lighten' ? 'checked' : ''} onchange="toggleColorMode('b1')">
                    <span class="slider"></span>
                </label>
            </div>

            ${state.colors.b1Mode === 'lighten' ? `
                <div class="slider-group">
                    <label>
                        <span>Lighten Amount</span>
                        <span id="percent-b1">${state.colors.b1Mix}%</span>
                    </label>
                    <input type="range" min="0" max="100" value="${state.colors.b1Mix}" oninput="updateColorMix('b1', this.value)">
                </div>
            ` : `
                <div class="color-input-group">
                    <input id="input-color-b1" type="color" value="${state.colors.b1}" oninput="updateColor('b1', this.value)">
                    <input id="input-text-b1" type="text" value="${state.colors.b1}" onchange="updateColor('b1', this.value)" placeholder="#000000">
                </div>
            `}
        </div>

        <div class="color-card">
            <h4>Background 2 (b2)</h4>
            <div id="preview-b2" class="color-preview" style="background-color: ${state.colors.b2}"></div>
            
            <div class="mode-toggle" style="margin-bottom: 1rem;">
                <span>Lighten from a2</span>
                <label class="switch">
                    <input type="checkbox" ${state.colors.b2Mode === 'lighten' ? 'checked' : ''} onchange="toggleColorMode('b2')">
                    <span class="slider"></span>
                </label>
            </div>

            ${state.colors.b2Mode === 'lighten' ? `
                <div class="slider-group">
                    <label>
                        <span>Lighten Amount</span>
                        <span id="percent-b2">${state.colors.b2Mix}%</span>
                    </label>
                    <input type="range" min="0" max="100" value="${state.colors.b2Mix}" oninput="updateColorMix('b2', this.value)">
                </div>
            ` : `
                <div class="color-input-group">
                    <input id="input-color-b2" type="color" value="${state.colors.b2}" oninput="updateColor('b2', this.value)">
                    <input id="input-text-b2" type="text" value="${state.colors.b2}" onchange="updateColor('b2', this.value)" placeholder="#000000">
                </div>
            `}
        </div>
    `;
}

function toggleColorMode(colorKey) {
    const currentMode = state.colors[`${colorKey}Mode`];
    const newMode = currentMode === 'lighten' ? 'manual' : 'lighten';
    state.colors[`${colorKey}Mode`] = newMode;

    if (newMode === 'lighten') {
        // Recalculate color based on current mix
        const mixValue = state.colors[`${colorKey}Mix`];
        const sourceColor = colorKey === 'b1' ? state.colors.a1 : state.colors.a2;
        state.colors[colorKey] = mixWithWhite(sourceColor, mixValue);
    }

    renderColors();
}

function updateColor(colorKey, value) {
    // Validate hex color
    if (!/^#[0-9A-F]{6}$/i.test(value)) {
        // Try to fix common issues
        if (value.startsWith('#')) {
            // Check length
            if (value.length > 7) value = value.substring(0, 7);
        } else {
            value = '#' + value;
        }
    }

    // Only update state if it looks like a valid hex (even if incomplete typing)
    // But for color input, it sends valid hex. For text input, we might want to wait.
    // Let's just update state and preview.

    state.colors[colorKey] = value;

    // Update preview directly
    const preview = document.getElementById(`preview-${colorKey}`);
    if (preview) preview.style.backgroundColor = value;

    // Sync inputs
    const colorInput = document.getElementById(`input-color-${colorKey}`);
    const textInput = document.getElementById(`input-text-${colorKey}`);

    if (colorInput && colorInput.value !== value) colorInput.value = value;
    if (textInput && textInput.value !== value) textInput.value = value;

    // Update dependent colors if in lighten mode
    if (colorKey === 'a1' && state.colors.b1Mode === 'lighten') {
        updateColorMix('b1', state.colors.b1Mix);
    } else if (colorKey === 'a2' && state.colors.b2Mode === 'lighten') {
        updateColorMix('b2', state.colors.b2Mix);
    }
}

function updateColorMix(colorKey, mixValue) {
    const mixPercent = parseInt(mixValue);
    state.colors[`${colorKey}Mix`] = mixPercent;

    const sourceColor = colorKey === 'b1' ? state.colors.a1 : state.colors.a2;
    const newColor = mixWithWhite(sourceColor, mixPercent);

    state.colors[colorKey] = newColor;

    // Update preview directly
    const preview = document.getElementById(`preview-${colorKey}`);
    if (preview) preview.style.backgroundColor = newColor;

    // Update percentage text directly
    const percentText = document.getElementById(`percent-${colorKey}`);
    if (percentText) percentText.textContent = `${mixPercent}%`;
}

// Initialize
init();



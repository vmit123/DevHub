function saveProjects() {
    localStorage.setItem('devhub_projects', JSON.stringify(projects));
}

const projectContainer = document.querySelector('#project-container');

function renderProjects(projectsToRender = projects) {
    projectContainer.innerHTML = "";

    if (projectsToRender.length === 0) {
    projectContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-3d-text">
                <span class="iso-text" data-text="DEVHUB">DEVHUB</span>
            </div>
            <h3>No search result</h3>
            <p>We couldn't find any projects matching your search or selected filter.</p>
            <button class="secondary-btn" data-action="reset-filters">Reset Filters</button>
        </div>
    `;
        updateSummary();
        return;
        }
    
    projectsToRender.forEach(function(project) {
        const projectCard = document.createElement('div');
        projectCard.classList.add('project-card');

        // Color logic for progress bar
        let barColor = "#dc3545"; 
        if (project.progress >= 50 && project.progress < 100) {
            barColor = "#ffc107"; 
        } else if (project.progress == 100) {
            barColor = "#28a745"; 
        }

        // Fixed typo: calling getDeadlineStatus
        const deadlineInfo = project.deadline 
            ? getDeadlineStatus(project.deadline, project.status)
            : { label: "No Deadline", className: "badge-ontrack" };

        // Split "React, Node, CSS" into individual clickable tags
        const techTagsHTML = project.technology
            .split(',')
            .map(tech => `<span class="tech-tag" data-action="filterByTag" data-tag="${tech.trim()}">${tech.trim()}</span>`)
            .join(' ');

        projectCard.innerHTML = `
            <div class="card-header">
                <h3>${project.name}</h3>
                <span class="deadline-badge ${deadlineInfo.className}">${deadlineInfo.label}</span>
            </div>

            <div class="tech-tags-container">
                ${techTagsHTML}
            </div>
            
            <p><strong>Status:</strong> ${project.status}</p>

            <div class="progress-section">
                <span><strong>Progress:</strong> ${project.progress}%</span>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${project.progress}%; background-color: ${barColor};"></div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="edit-btn" data-action="edit" data-id="${project.id}">Edit</button>
                <button class="delete-btn" data-action="delete" data-id="${project.id}">Delete</button>
            </div>
        `;
        projectContainer.append(projectCard);
    });

    updateSummary();
}

const addProjectForm = document.querySelector('#add-project-form');

const addFormError = document.querySelector('#add-form-error');

addProjectForm.addEventListener('submit', function(event) {
    event.preventDefault();

    // Extract & sanitize values
    const name = document.querySelector('#project-name').value.trim();
    const technology = document.querySelector('#project-tech').value.trim();
    const status = document.querySelector('#project-status').value;
    const progress = Number(document.querySelector('#project-progress').value);
    const deadline = document.querySelector('#project-deadline').value;

    // Reset previous error state
    addFormError.style.display = 'none';
    addFormError.textContent = '';

    // 1. Validation: Check for empty string inputs after trimming spaces
    if (!name || !technology) {
        showFormError('Project name and technology fields cannot be empty.');
        return;
    }

    // 2. Validation: Progress percentage range sanity check
    if (isNaN(progress) || progress < 0 || progress > 100) {
        showFormError('Progress must be a valid number between 0 and 100.');
        return;
    }

    // 3. Validation: Past date check for target deadline
    const selectedDeadline = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDeadline.setHours(0, 0, 0, 0);

    if (selectedDeadline < today && status !== 'Completed') {
        showFormError('Target deadline cannot be set to a past date for active projects.');
        return;
    }

    // State update if validation passes
    const newProject = {
        id: Date.now(),
        name,
        technology,
        status,
        progress,
        deadline
    };

    projects.push(newProject);
    saveProjects();
    renderProjects();
    addProjectForm.reset();
});

// Helper function to render validation messages
function showFormError(message) {
    addFormError.textContent = message;
    addFormError.style.display = 'block';
}

function deleteProject(id) {
    const index = projects.findIndex(function(project) {
        return project.id === id;
    });

    if (index !== -1) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
    }
}

// NEW REPLACEMENT VERSION
function updateSummary() {
    const totalCount = projects.length;
    const inProgressCount = projects.filter(project => project.status === "In Progress").length;
    const completedCount = projects.filter(project => project.status === "Completed").length;

    document.querySelector('#total-count').textContent = totalCount;
    document.querySelector('#in-progress-count').textContent = inProgressCount;
    document.querySelector('#completed-count').textContent = completedCount;

    // Connects reduce analytics to the new DOM nodes:
    const analytics = calculateDashboardMetrics(projects);

    const completionRateEl = document.querySelector('#completion-rate');
    const avgProgressEl = document.querySelector('#avg-progress');
    const overdueCountEl = document.querySelector('#overdue-count');

    if (completionRateEl) completionRateEl.textContent = `${analytics.completionRate}%`;
    if (avgProgressEl) avgProgressEl.textContent = `${analytics.averageProgress}%`;
    if (overdueCountEl) overdueCountEl.textContent = analytics.overdueCount;
}

const searchInput = document.querySelector('#search-input');
const statusFilter = document.querySelector('#status-filter');
const sortSelect = document.querySelector('#sort-select');

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value;
    const sortBy = sortSelect.value;

    let filtered = projects.filter(function(project) {
        const matchesName = project.name.toLowerCase().includes(searchTerm);
        const matchesStatus = (selectedStatus === "All") || (project.status === selectedStatus);
        return matchesName && matchesStatus;
    });

    filtered.sort(function(a, b) {
        if (sortBy === "name-asc") {
            return a.name.localeCompare(b.name);
        } else if (sortBy === "progress-desc") {
            return b.progress - a.progress;
        } else if (sortBy === "progress-asc") {
            return a.progress - b.progress;
        } else if (sortBy === "newest") {
            return b.id - a.id;
        }
    });

    renderProjects(filtered);
}

searchInput.addEventListener('input', filterProjects);
statusFilter.addEventListener('change', filterProjects);
sortSelect.addEventListener('change', filterProjects);

const exportBtn = document.querySelector('#export-btn');
const importBtn = document.querySelector('#import-btn');
const importFileInput = document.querySelector('#import-file-input');

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "devhub_projects.json");
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedProjects = JSON.parse(e.target.result);
            if (Array.isArray(importedProjects)) {
                projects = importedProjects;
                saveProjects();
                renderProjects();
                alert("Projects imported successfully!");
            } else {
                alert("Invalid JSON format: Expected an array of projects.");
            }
        } catch (err) {
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    importFileInput.value = '';
}

exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importData);

const editModal = document.querySelector('#edit-modal');
const editForm = document.querySelector('#edit-project-form');
const closeModalBtn = document.querySelector('#close-modal-btn');

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    document.querySelector('#edit-project-id').value = project.id;
    document.querySelector('#edit-project-name').value = project.name;
    document.querySelector('#edit-project-tech').value = project.technology;
    document.querySelector('#edit-project-status').value = project.status;
    document.querySelector('#edit-project-progress').value = project.progress;
    document.querySelector('#edit-project-deadline').value = project.deadline || '';
    editModal.style.display = 'flex';
}

function closeModal() {
    editModal.style.display = 'none';
}

editForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = Number(document.querySelector('#edit-project-id').value);
    const project = projects.find(p => p.id === id);
    if (project) {
        project.name = document.querySelector('#edit-project-name').value;
        project.technology = document.querySelector('#edit-project-tech').value;
        project.status = document.querySelector('#edit-project-status').value;
        project.progress = Number(document.querySelector('#edit-project-progress').value);
        project.deadline = document.querySelector('#edit-project-deadline').value;
        saveProjects();
        renderProjects();
        closeModal();
    }
});

closeModalBtn.addEventListener('click', closeModal);

window.addEventListener('click', function(e) {
    if (e.target === editModal) {
        closeModal();
    }
});

function filterByTag(tag) {
    searchInput.value = tag;
    filterProjects();
}

const themeToggleBtn = document.querySelector('#theme-toggle');
const currentTheme = localStorage.getItem('devhub_theme') || 'light';

if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggleBtn.textContent = '☀️ Light Mode';
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('devhub_theme', 'light');
        themeToggleBtn.textContent = '🌙 Dark Mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('devhub_theme', 'dark');
        themeToggleBtn.textContent = '☀️ Light Mode';
    }
}

themeToggleBtn.addEventListener('click', toggleTheme);

// Fixed function name and return object structure
function getDeadlineStatus(deadlineStr, projectStatus) {
    if (projectStatus === "Completed") {
        return { label: "Completed", className: "badge-completed" };
    }
    const curr = new Date();
    const deadLine = new Date(deadlineStr);
    
    // Normalize hours to midnight to compare calendar days accurately
    curr.setHours(0, 0, 0, 0);
    deadLine.setHours(0, 0, 0, 0);

    const diffTime = deadLine - curr;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return { label: `Overdue by ${Math.abs(days)}d`, className: "badge-overdue" };
    } else if (days <= 3) {
        return { label: `Due in ${days}d`, className: "badge-warning" };
    } else {
        return { label: `On Track (${days}d left)`, className: "badge-ontrack" };
    }
}

// Initial Render
renderProjects();

// Event delegation for edit, delete, and filter by tag 
projectContainer.addEventListener('click', function(e) {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === 'edit') {
        const id = Number(e.target.dataset.id);
        editProject(id);
    } else if (action === 'delete') {
        const id = Number(e.target.dataset.id);
        deleteProject(id);
    } else if (action === 'filter-tag') {
        const tag = e.target.dataset.tag;
        filterByTag(tag);
    }else if (action === 'reset-filters') {
        resetFilters(); // <--- Triggers reset when button is clicked
    }
});


function resetFilters() {
    searchInput.value = '';
    statusFilter.value = 'All';
    sortSelect.value = 'newest';
    filterProjects(); // Re-runs filtering to clear empty state and display projects
}


// additonal function  using event listener and delegation and all stuff

function calculateDashboardMetrics(projectsList = projects) {
    if (projectsList.length === 0) {
        return { completionRate: 0, averageProgress: 0, overdueCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = projectsList.reduce((acc, project) => {
        acc.totalProgress += project.progress;

        if (project.status === 'Completed') {
            acc.completedCount += 1;
        }

        if (project.deadline && project.status !== 'Completed') {
            const deadlineDate = new Date(project.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            if (deadlineDate < today) {
                acc.overdueCount += 1;
            }
        }

        return acc;
    }, { totalProgress: 0, completedCount: 0, overdueCount: 0 });

    const totalProjects = projectsList.length;
    return {
        completionRate: Math.round((metrics.completedCount / totalProjects) * 100),
        averageProgress: Math.round(metrics.totalProgress / totalProjects),
        overdueCount: metrics.overdueCount
    };
}
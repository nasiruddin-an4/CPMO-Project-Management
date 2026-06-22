const announcementText = document.getElementById('announcementText');
const saveAnnouncementBtn = document.getElementById('saveAnnouncementBtn');
const teamButtons = document.getElementById('teamButtons');
const mainContent = document.getElementById('mainContent');
const projectSection = document.getElementById('projectSection');
const todoSection = document.getElementById('todoSection');
const addProjectBtn = document.getElementById('addProjectBtn');
const addTodoBtn = document.getElementById('addTodoBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');

let selectedMemberId = null;
let teamName = '';
let currentProjects = [];
let currentTodos = [];

function ensureProtocol(url) {
    if (!url) return url;
    if (/^https?:\/\/|^ftp:\/\/|^\//.test(url)) {
        return url;
    }
    return 'https://' + url;
}

function initializeModal() {
    if (modalOverlay) {
        modalOverlay.classList.add('hidden');
        modalOverlay.style.display = 'none';
    }
    if (modalTitle) {
        modalTitle.textContent = '';
    }
    if (modalBody) {
        modalBody.innerHTML = '';
    }
}

function fetchJson(url, options = {}) {
    options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    return fetch(url, options).then(response => response.json());
}

function announceToast(message, icon = 'success') {
    if (typeof Swal === 'undefined') {
        console.log(message);
        return;
    }
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title: message,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-toast-popup',
        },
    });
}

function swalConfirm(message) {
    if (typeof Swal === 'undefined') {
        return Promise.resolve(window.confirm(message));
    }
    return Swal.fire({
        title: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true,
    }).then(result => result.isConfirmed);
}

function loadAnnouncement() {
    fetchJson('/api/announcement/')
        .then(result => {
            announcementText.value = result.data?.message || '';
        })
        .catch(console.error);
}

function saveAnnouncement() {
    fetchJson('/api/announcement/', {
        method: 'POST',
        body: JSON.stringify({ message: announcementText.value || '' }),
    })
        .then(() => {
            announceToast('Message updated successfully');
        })
        .catch(console.error);
}

function loadTeamMembers() {
    fetchJson('/api/team-members/')
        .then(result => {
            teamButtons.innerHTML = '';
            result.data.forEach(member => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'member-button';
                button.textContent = member.name;
                button.onclick = () => selectMember(member.id, member.name, button);
                teamButtons.appendChild(button);
            });
        })
        .catch(console.error);
}

function selectMember(id, name, button) {
    selectedMemberId = id;
    teamName = name;
    document.querySelectorAll('.member-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    mainContent.classList.remove('hidden');
    loadTeamData();
}

function loadTeamData() {
    if (!selectedMemberId) return Promise.resolve();
    return fetchJson(`/api/team/${selectedMemberId}/data/`)
        .then(result => {
            currentProjects = result.data.projects || [];
            currentTodos = result.data.todos || [];
            renderProjects(currentProjects);
            renderTodos(currentTodos);
            return result;
        })
        .catch(error => {
            console.error(error);
            return null;
        });
}

function renderProjects(projects) {
    const table = document.createElement('div');
    table.className = 'table-wrapper';
    if (!projects.length) {
        table.innerHTML = '<p>No projects found. Add a new project to begin.</p>';
        projectSection.innerHTML = '';
        projectSection.appendChild(table);
        return;
    }

    const html = [
        '<table class="data-table">',
        '<thead><tr>',
        '<th>Project</th><th>ECP</th><th>Note</th><th>Final status</th><th>Actions</th>',
        '</tr></thead>',
        '<tbody>'
    ];

    projects.forEach(project => {
        html.push(`
            <tr data-project-id="${project.id}">
                <td>${escapeHtml(project.project_name)}</td>
                <td>${project.estimated_complete_date || ''}</td>
                <td>${escapeHtml(project.note)}</td>
                <td>${statusLabel(project.final_status)}</td>
                <td>
                    <div class="action-group">
                        <button type="button" class="icon-button" onclick="openProjectDetails(${project.id})">👁</button>
                        <button type="button" class="icon-button" onclick="openProjectEdit(${project.id})">✎</button>
                        <button type="button" class="icon-button" onclick="deleteProject(${project.id})">🗑</button>
                    </div>
                </td>
            </tr>
        `);
    });

    html.push('</tbody></table>');
    table.innerHTML = html.join('');
    projectSection.innerHTML = '';
    projectSection.appendChild(table);
}

function openProjectDetails(projectId) {
    const project = currentProjects.find(item => item.id === projectId);
    if (!project) return;

    const docsHtml = project.documents.length
        ? project.documents
              .map(doc => `
                <div class="document-line">
                    <div class="document-name">${escapeHtml(doc.doc_name)}</div>
                    <div class="document-actions">
                        <a href="${escapeHtml(ensureProtocol(doc.doc_link))}" target="_blank">View link</a>
                        <button type="button" class="icon-button" onclick="deleteProjectDocument(${doc.id}, ${project.id})">🗑</button>
                    </div>
                </div>
            `)
              .join('')
        : '<p class="empty-state">No documents added yet.</p>';

    const remarksHtml = project.remarks.length
        ? project.remarks
              .map(remark => `
                <div class="remark-line">
                    <strong>${escapeHtml(remark.author_name)}</strong>
                    <div>${escapeHtml(remark.remark)}</div>
                    <button type="button" class="icon-button" onclick="deleteProjectRemark(${remark.id}, ${project.id})">🗑</button>
                </div>
            `)
              .join('')
        : '<p class="empty-state">No remarks added yet.</p>';

    const content = `
        <div class="detail-grid">
            <div class="detail-pair"><span>Project</span><span>${escapeHtml(project.project_name)}</span></div>
            <div class="detail-pair"><span>ECP</span><span>${project.estimated_complete_date || ''}</span></div>
            <div class="detail-pair"><span>Status %</span><span>${project.status_percent}%</span></div>
            <div class="detail-pair"><span>Final status</span><span>${statusLabel(project.final_status)}</span></div>
            <div class="detail-full"><strong>Note</strong><div>${escapeHtml(project.note)}</div></div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Documentation</div>
            ${docsHtml}
        </div>
        <div class="detail-section">
            <div class="detail-section-title">Remarks</div>
            ${remarksHtml}
        </div>
    `;

    openModal(`Project details`, content);
}

async function deleteProjectDocument(documentId, projectId, returnToEdit = false) {
    if (!(await swalConfirm('Delete this document?'))) return;
    fetchJson(`/api/project/document/delete/${documentId}/`, { method: 'POST', body: JSON.stringify({}) })
        .then(() => loadTeamData())
        .then(() => {
            announceToast('Document deleted successfully');
            if (returnToEdit) {
                openProjectEdit(projectId);
            } else {
                openProjectDetails(projectId);
            }
        })
        .catch(error => {
            console.error(error);
            announceToast('Failed to delete document.', 'error');
        });
}

async function deleteProject(projectId) {
    if (!(await swalConfirm('Delete this project?'))) return;
    fetchJson(`/api/project/delete/${projectId}/`, { method: 'POST', body: JSON.stringify({}) })
        .then(() => {
            announceToast('Project deleted successfully');
            loadTeamData();
        })
        .catch(error => {
            console.error(error);
            announceToast('Failed to delete project.', 'error');
        });
}

async function deleteProjectRemark(remarkId, projectId, returnToEdit = false) {
    if (!(await swalConfirm('Delete this remark?'))) return;
    fetchJson(`/api/project/remark/delete/${remarkId}/`, { method: 'POST', body: JSON.stringify({}) })
        .then(() => loadTeamData())
        .then(() => {
            announceToast('Remark deleted successfully');
            if (returnToEdit) {
                openProjectEdit(projectId);
            } else {
                openProjectDetails(projectId);
            }
        })
        .catch(error => {
            console.error(error);
            announceToast('Failed to delete remark.', 'error');
        });
}

function renderTodos(todos) {
    const table = document.createElement('div');
    table.className = 'table-wrapper';
    if (!todos.length) {
        table.innerHTML = '<p>No to-do items found. Add a new note to begin.</p>';
        todoSection.innerHTML = '';
        todoSection.appendChild(table);
        return;
    }

    const html = [
        '<table class="data-table">',
        '<thead><tr>',
        '<th>Done</th><th>Note</th><th>Actions</th>',
        '</tr></thead>',
        '<tbody>'
    ];
    todos.forEach(todo => {
        html.push(`
            <tr data-todo-id="${todo.id}">
                <td><input type="checkbox" ${todo.is_completed ? 'checked' : ''} onchange="toggleTodoStatus(${todo.id}, this.checked)"></td>
                <td class="todo-note">${escapeHtml(todo.note)}</td>
                <td>
                    <div class="action-group">
                        <button type="button" class="icon-button" onclick="openTodoEdit(${todo.id}, '${escapeJs(todo.note)}', ${todo.is_completed})">✎</button>
                        <button type="button" class="icon-button" onclick="deleteTodo(${todo.id})">🗑</button>
                    </div>
                </td>
            </tr>
        `);
    });
    html.push('</tbody></table>');
    table.innerHTML = html.join('');
    todoSection.innerHTML = '';
    todoSection.appendChild(table);
}

function statusLabel(value) {
    const labels = {
        not_started: 'Not started yet',
        under_development: 'Under development',
        completed: 'Completed',
        hold: 'In hold',
        upcoming: 'Upcoming',
    };
    return `<span class="status-chip">${labels[value] || value}</span>`;
}

function openModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    modalOverlay.classList.remove('hidden');
    modalOverlay.style.display = 'grid';
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    modalOverlay.style.display = 'none';
    modalBody.innerHTML = '';
}

modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', event => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

function openProjectEdit(projectId = null) {
    const project = projectId ? currentProjects.find(item => item.id === projectId) : null;
    const docsHtml = project
        ? project.documents.length
              ? project.documents
                    .map(doc => `
                        <div class="document-line">
                            <div class="document-name">${escapeHtml(doc.doc_name)}</div>
                            <div class="document-actions">
                                <a href="${escapeHtml(ensureProtocol(doc.doc_link))}" target="_blank">View link</a>
                                <button type="button" class="icon-button" onclick="openDocumentModal(${project.id}, true, ${doc.id}, '${escapeJs(doc.doc_name)}', '${escapeJs(doc.doc_link)}')">✎</button>
                                <button type="button" class="icon-button" onclick="deleteProjectDocument(${doc.id}, ${project.id}, true)">🗑</button>
                            </div>
                        </div>
                    `)
                    .join('')
              : '<p class="empty-state">No documents added yet.</p>'
        : '';

    const remarksHtml = project
        ? project.remarks.length
              ? project.remarks
                    .map(remark => `
                        <div class="remark-line">
                            <strong>${escapeHtml(remark.author_name)}</strong>
                            <div>${escapeHtml(remark.remark)}</div>
                            <div class="document-actions">
                                <button type="button" class="icon-button" onclick="openRemarkModal(${project.id}, true, ${remark.id}, '${escapeJs(remark.author_name)}', '${escapeJs(remark.remark)}')">✎</button>
                                <button type="button" class="icon-button" onclick="deleteProjectRemark(${remark.id}, ${project.id}, true)">🗑</button>
                            </div>
                        </div>
                    `)
                    .join('')
              : '<p class="empty-state">No remarks added yet.</p>'
        : '';

    const title = projectId ? 'Edit project' : 'Add project';
    const content = `
        <div class="form-row"><label>Project name</label><input id="projectName" type="text"></div>
        <div class="form-row"><label>Status %</label><input id="projectStatus" type="number" min="0" max="100"></div>
        <div class="form-row"><label>Estimated complete date</label><input id="projectDate" type="date"></div>
        <div class="form-row"><label>Note</label><textarea id="projectNote"></textarea></div>
        <div class="form-row"><label>Final status</label><select id="projectFinalStatus">
            <option value="not_started">Not started yet</option>
            <option value="under_development">Under development</option>
            <option value="completed">Completed</option>
            <option value="hold">In hold</option>
            <option value="upcoming">Upcoming</option>
        </select></div>
        ${projectId ? `
            <div class="detail-section">
                <div class="detail-section-title">Documentation</div>
                ${docsHtml}
                <button type="button" class="secondary-button" onclick="openDocumentModal(${project.id}, true)">Add document</button>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">Remarks</div>
                ${remarksHtml}
                <button type="button" class="secondary-button" onclick="openRemarkModal(${project.id}, true)">Add remark</button>
            </div>
        ` : ''}
        <div class="submit-row"><button type="button" class="secondary-button" onclick="submitProject(${projectId || 'null'})">Save</button></div>
    `;
    openModal(title, content);

    if (project) {
        document.getElementById('projectName').value = project.project_name || '';
        document.getElementById('projectStatus').value = project.status_percent || '';
        document.getElementById('projectDate').value = project.estimated_complete_date || '';
        document.getElementById('projectNote').value = project.note || '';
        document.getElementById('projectFinalStatus').value = project.final_status || 'not_started';
    }
}

function submitProject(projectId = null) {
    const data = {
        id: projectId,
        team_member_id: selectedMemberId,
        project_name: document.getElementById('projectName').value,
        status_percent: parseInt(document.getElementById('projectStatus').value, 10) || 0,
        estimated_complete_date: document.getElementById('projectDate').value || null,
        note: document.getElementById('projectNote').value,
        final_status: document.getElementById('projectFinalStatus').value,
    };
    fetchJson('/api/project/save/', { method: 'POST', body: JSON.stringify(data) })
        .then(() => {
            closeModal();
            loadTeamData();
        })
        .catch(console.error);
}

function openDocumentModal(projectId, returnToEdit = false, docId = null, docName = '', docLink = '') {
    const content = `
        <div class="form-row"><label>Document name</label><input id="docName" type="text"></div>
        <div class="form-row"><label>Document link</label><input id="docLink" type="url"></div>
        <div class="submit-row"><button type="button" class="secondary-button" id="docSaveBtn">Save</button></div>
    `;
    openModal(docId ? 'Edit document' : 'Add documentation', content);
    // Prefill if editing
    if (docId) {
        document.getElementById('docName').value = docName || '';
        document.getElementById('docLink').value = docLink || '';
    }
    document.getElementById('docSaveBtn').onclick = () => submitDocument(projectId, returnToEdit, docId);
}

function submitDocument(projectId, returnToEdit = false, docId = null) {
    const data = {
        id: docId,
        project_id: projectId,
        doc_name: document.getElementById('docName').value,
        doc_link: document.getElementById('docLink').value,
    };
    fetchJson('/api/project/document/', { method: 'POST', body: JSON.stringify(data) })
        .then(() => {
            closeModal();
            return loadTeamData();
        })
        .then(() => {
            if (returnToEdit) {
                openProjectEdit(projectId);
            }
        })
        .catch(console.error);
}

function openRemarkModal(projectId, returnToEdit = false, remarkId = null, author = '', text = '') {
    const content = `
        <div class="form-row"><label>Your name</label><input id="remarkAuthor" type="text" placeholder="Riyad, Nasir or Shuvo"></div>
        <div class="form-row"><label>Remark</label><textarea id="remarkText"></textarea></div>
        <div class="submit-row"><button type="button" class="secondary-button" id="remarkSaveBtn">Save</button></div>
    `;
    openModal(remarkId ? 'Edit remark' : 'Add remark', content);
    if (remarkId) {
        document.getElementById('remarkAuthor').value = author || '';
        document.getElementById('remarkText').value = text || '';
    }
    document.getElementById('remarkSaveBtn').onclick = () => submitRemark(projectId, returnToEdit, remarkId);
}

function submitRemark(projectId, returnToEdit = false, remarkId = null) {
    const data = {
        id: remarkId,
        project_id: projectId,
        author_name: document.getElementById('remarkAuthor').value,
        remark: document.getElementById('remarkText').value,
    };
    fetchJson('/api/project/remark/', { method: 'POST', body: JSON.stringify(data) })
        .then(() => {
            closeModal();
            return loadTeamData();
        })
        .then(() => {
            if (returnToEdit) {
                openProjectEdit(projectId);
            }
        })
        .catch(console.error);
}

function openTodoEdit(todoId = null, note = '', isCompleted = false) {
    const title = todoId ? 'Edit to-do' : 'Add to-do';
    const content = `
        <div class="form-row"><label>Note</label><textarea id="todoNote">${note}</textarea></div>
        <div class="form-row"><label><input id="todoComplete" type="checkbox" ${isCompleted ? 'checked' : ''}> Mark completed</label></div>
        <div class="submit-row"><button type="button" class="secondary-button" onclick="submitTodo(${todoId || 'null'})">Save</button></div>
    `;
    openModal(title, content);
}

function submitTodo(todoId = null) {
    const data = {
        id: todoId,
        team_member_id: selectedMemberId,
        note: document.getElementById('todoNote').value,
        is_completed: document.getElementById('todoComplete').checked,
    };
    fetchJson('/api/todo/save/', { method: 'POST', body: JSON.stringify(data) })
        .then(() => {
            closeModal();
            loadTeamData();
        })
        .catch(console.error);
}

async function deleteTodo(todoId) {
    if (!(await swalConfirm('Delete this to-do item?'))) return;
    fetchJson(`/api/todo/delete/${todoId}/`, { method: 'POST', body: JSON.stringify({}) })
        .then(() => {
            announceToast('To-do deleted successfully');
            loadTeamData();
        })
        .catch(error => {
            console.error(error);
            announceToast('Failed to delete to-do.', 'error');
        });
}

function toggleTodoStatus(todoId, completed) {
    const row = document.querySelector(`tr[data-todo-id='${todoId}']`);
    const note = row?.children[1]?.textContent || '';
    fetchJson('/api/todo/save/', {
        method: 'POST',
        body: JSON.stringify({ id: todoId, team_member_id: selectedMemberId, note, is_completed: completed }),
    })
        .then(() => loadTeamData())
        .catch(console.error);
}

function escapeHtml(value) {
    return value?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '';
}

function escapeJs(value) {
    return value?.replace(/'/g, "\\'").replace(/"/g, '&quot;') || '';
}

function announceToast(message) {
    console.log(message);
}

saveAnnouncementBtn.addEventListener('click', saveAnnouncement);
addProjectBtn.addEventListener('click', () => openProjectEdit());
addTodoBtn.addEventListener('click', () => openTodoEdit());

initializeModal();
loadAnnouncement();
loadTeamMembers();

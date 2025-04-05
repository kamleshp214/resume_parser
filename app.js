document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('uploadForm');
    const resumeFile = document.getElementById('resumeFile');
    const processBtn = document.getElementById('processBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsContainer = document.getElementById('resultsContainer');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));

    let processedResumes = [];

    uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const file = resumeFile.files[0];
        if (!file) {
            showError('Please select a file to upload');
            return;
        }

        toggleLoading(true);

        const formData = new FormData();
        formData.append('resume', file);

        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            // Assign fallback ID if not available
            data.id = data.id || Date.now();

            processedResumes.unshift(data);
            displayResumes(processedResumes);
            uploadForm.reset();

        } catch (error) {
            showError('Failed to process resume. Please try again.');
            console.error('Upload error:', error);
        } finally {
            toggleLoading(false);
        }
    });

    searchBtn.addEventListener('click', function () {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredResumes = processedResumes.filter(resume => {
            const skills = (resume.skills || []).map(skill => skill.toLowerCase());
            return skills.some(skill => skill.includes(searchTerm));
        });
        displayResumes(filteredResumes);
    });

    sortSelect.addEventListener('change', function () {
        const sortedResumes = [...processedResumes];
        switch (this.value) {
            case 'score_high':
                sortedResumes.sort((a, b) => b.ats_score - a.ats_score);
                break;
            case 'score_low':
                sortedResumes.sort((a, b) => a.ats_score - b.ats_score);
                break;
        }
        displayResumes(sortedResumes);
    });

    function displayResumes(resumes) {
        resultsContainer.innerHTML = '';

        if (resumes.length === 0) {
            resultsContainer.innerHTML = `
                <div class="alert alert-info">
                    No resumes found matching your criteria.
                </div>
            `;
            return;
        }

        resumes.forEach(resume => {
            const resumeCard = createResumeCard(resume);
            resultsContainer.appendChild(resumeCard);
        });
    }

    function createResumeCard(resume) {
        const card = document.createElement('div');
        card.className = 'card resume-card fade-in';

        const score = resume.ats_score || 0;
        const name = resume.name || 'Unknown';
        const email = resume.email || 'Not Found';
        const phone = resume.phone || 'Not Found';
        const skills = Array.isArray(resume.skills) && resume.skills.length > 0
            ? resume.skills.map(skill => `<span class="skill-badge">${skill}</span>`).join('')
            : '<span class="text-muted">No skills detected</span>';
        const scoreColor = getScoreColor(score);
        const rawText = resume.raw_text ? resume.raw_text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

        const id = resume.id || Date.now();

        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${name}</h5>
                    <span class="badge bg-${scoreColor}">ATS Score: ${score}%</span>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><i class="bi bi-envelope"></i> ${email}</p>
                        <p><i class="bi bi-telephone"></i> ${phone}</p>
                    </div>
                    <div class="col-md-6">
                        <div class="progress mb-2">
                            <div class="progress-bar bg-${scoreColor}" 
                                 role="progressbar" 
                                 style="width: ${score}%" 
                                 aria-valuenow="${score}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="skills-section mt-3">
                    <h6>Skills</h6>
                    <div>${skills}</div>
                </div>

                <div class="mt-3">
                    <button class="btn btn-sm btn-outline-primary" 
                            type="button" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#rawText${id}">
                        View Raw Text
                    </button>
                    <div class="collapse mt-2" id="rawText${id}">
                        <div class="card card-body raw-text">
                            <pre class="mb-0">${rawText}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    function toggleLoading(show) {
        loadingOverlay.classList.toggle('d-none', !show);
        processBtn.disabled = show;
    }

    function showError(message) {
        document.querySelector('#errorToast .toast-body').textContent = message;
        errorToast.show();
    }

    function getScoreColor(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    }
});
function createResumeCard(resume) {
    const card = document.createElement('div');
    card.className = 'card resume-card fade-in';

    const score = resume.ats_score || 0;
    const name = resume.name || 'Unknown';
    const email = resume.email || 'Not Found';
    const phone = resume.phone || 'Not Found';
    const linkedin = resume.linkedin || '';
    const skillsArray = Array.isArray(resume.skills) ? resume.skills : [];

    const skills = skillsArray.length > 0
        ? skillsArray.map(skill => `<span class="skill-badge">${skill}</span>`).join(' ')
        : '<span class="text-muted">No skills detected</span>';

    const scoreColor = getScoreColor(score);
    const rawText = resume.raw_text ? resume.raw_text.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    const id = resume.id || Date.now();

    card.innerHTML = `
        <div class="card-header">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${name}</h5>
                <span class="badge bg-${scoreColor}">ATS Score: ${score}%</span>
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><i class="bi bi-envelope"></i> <a href="mailto:${email}">${email}</a></p>
                    <p><i class="bi bi-telephone"></i> <a href="tel:${phone}">${phone}</a></p>
                    ${linkedin ? `<p><i class="bi bi-linkedin"></i> <a href="${linkedin}" target="_blank">LinkedIn Profile</a></p>` : ''}
                </div>
                <div class="col-md-6">
                    <div class="progress mb-2">
                        <div class="progress-bar bg-${scoreColor}" 
                             role="progressbar" 
                             style="width: ${score}%" 
                             aria-valuenow="${score}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
            </div>
            <div class="skills-section mt-3">
                <h6>Skills</h6>
                <div>${skills}</div>
            </div>

            <div class="mt-3">
                <button class="btn btn-sm btn-outline-primary" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#rawText${id}">
                    View Raw Text
                </button>
                <div class="collapse mt-2" id="rawText${id}">
                    <div class="card card-body raw-text">
                        <pre class="mb-0">${rawText}</pre>
                    </div>
                </div>
            </div>
        </div>
    `;

    return card;
}

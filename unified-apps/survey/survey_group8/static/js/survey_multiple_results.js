document.addEventListener('DOMContentLoaded', () => {
    const surveyId = getSurveyIdFromURL();
    fetchSurveyResults(surveyId);
});

function getSurveyIdFromURL() {
    const segments = window.location.pathname.split('/');
    return segments[segments.length - 2]; // Assuming the ID is the second last segment.
}

function fetchSurveyResults(surveyId) {
    fetch(`/results/closed/${surveyId}/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    })
        .then(handleResponse)
        .then((data) => {
            updateSurveyInfo(data);
            renderResults(data.organized_question_data, data.total_respondents_data);
        })
        .catch(handleError);
}

function handleResponse(response) {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
}

function updateSurveyInfo(data) {
    document.getElementById('survey-name').textContent = data.survey_name;
    document.getElementById('survey-description').textContent = data.survey_description;
}

function renderResults(organizedQuestionData, totalRespondentsData) {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = ''; // Clear any of the previous content 
    for (const [questionText, questionData] of Object.entries(organizedQuestionData)) {
        const questionTable = createResultsTable(questionText, questionData, totalRespondentsData);
        resultsContainer.appendChild(questionTable);
    }
}

function createResultsTable(questionText, questionData, totalRespondentsData) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '20px';

    // Create the first header rows for the "Question"
    const questionHeaderRow = document.createElement('tr');
    questionHeaderRow.innerHTML = `
        <th style="border: 1px solid #ddd; padding: 8px;" colspan="${2 + totalRespondentsData.length}">
            Question: ${questionText}
        </th>`;
    table.appendChild(questionHeaderRow);

    // Create the second header row for "Answer" and "Publications"
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th style="border: 1px solid #ddd; padding: 8px;">Answer</th>`;

    for (const publication of totalRespondentsData) {
        const publicationLabel = `
            <div>
                <span style="font-weight: bold;">Publication ${publication[0]}</span>
                <br>
                <span style="font-size: 0.8em; color: #666;">Responses: ${publication[1]}</span>
            </div>`;
        headerRow.innerHTML += `<th style="border: 1px solid #ddd; padding: 8px;">${publicationLabel}</th>`;
    }
    table.appendChild(headerRow);

    // Add responses and the relevant publishing data to the table rows.
    for (const [answerText, answerInfo] of Object.entries(questionData.answers)) {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="border: 1px solid #ddd; padding: 8px;">${answerText}</td>`;

        for (const publication of totalRespondentsData) {
            const version = publication[0];
            const resultData = answerInfo.versions[version];
            const cellContent = resultData
                ? `${resultData.count} (${resultData.percentage.toFixed(1)}%)`
                : '0 (0.0%)';
            row.innerHTML += `<td style="border: 1px solid #ddd; padding: 8px;">${cellContent}</td>`;
        }

        table.appendChild(row);
    }

    // For the bar chart, add a row.
    const canvasRow = document.createElement('tr');
    const canvasCell = document.createElement('td');
    canvasCell.colSpan = 2 + totalRespondentsData.length; // Span across all columns
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${questionText.replace(/\s+/g, '-')}`;
    canvasCell.appendChild(canvas);
    canvasRow.appendChild(canvasCell);
    table.appendChild(canvasRow);

    // After a short wait, render the bar chart.
    setTimeout(() => {
        renderBarChart(canvas.id, questionData);
    }, 0);

    return table;
}


function renderBarChart(canvasId, questionData) {
    const labels = Object.keys(questionData.answers);
    const datasets = [];
    const totalRespondents = questionData.total_respondents;

    const versionsSet = new Set(Object.keys(totalRespondents));
    const colors = [
        'rgba(0, 123, 255, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
    ];

    versionsSet.forEach((version, index) => {
        const dataPercentages = labels.map((answer) => {
            return questionData.answers[answer].versions[version]?.percentage || 0;
        });

        datasets.push({
            label: `Publication ${version}`,
            data: dataPercentages,
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.6', '1'),
            borderWidth: 1,
        });
    });

    const data = {
        labels: labels,
        datasets: datasets,
    };

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) {
        console.error(`No canvas found with id: ${canvasId}`);
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false, // To manage size, turn off the fixed aspect ratio.
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                },
            },
            plugins: {
                legend: {
                    position: 'top', // For larger charts, reposition the legend.
                },
            },
        },
    });
}

function handleError(error) {
    console.error('There was a problem with the fetch operation:', error);
}

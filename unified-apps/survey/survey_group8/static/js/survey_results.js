document.addEventListener('DOMContentLoaded', function () {
    const questionData = JSON.parse(document.getElementById('question-data').textContent);

    questionData.forEach((question, index) => {
        const ctx = document.getElementById('chart-' + (index + 1)).getContext('2d');
        const labels = question.answers.map(answer => answer.answer_text);
        const totalRespondentsQuestion = question.total_respondents_question;

        const dataCounts = totalRespondentsQuestion > 0
            ? question.answers.map(answer => ((answer.count / totalRespondentsQuestion) * 100).toFixed(2))
            : question.answers.map(() => 0);

        const data = {
            labels: labels,
            datasets: [{
                label: 'Percentage of Responses (%)',
                data: dataCounts,
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: true, // Allow for the maintenance of the aspect ratio
            aspectRatio: 2, // Modify the ratio of width to height (2 indicates that width is 2x height).
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false // For simplicity, conceal the legend.
                }
            }
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    });
});

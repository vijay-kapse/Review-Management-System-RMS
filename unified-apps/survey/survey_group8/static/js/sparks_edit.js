let qId = 0;

function getSurveyBasePath() {
    const scriptName = document.documentElement.getAttribute('data-script-name');
    if (scriptName) return scriptName.replace(/\/$/, '');

    const path = window.location.pathname.replace(/\/+$/, '');
    const surveyIndex = path.indexOf('/survey');
    if (surveyIndex !== -1) {
        return path.slice(0, surveyIndex + '/survey'.length);
    }

    return '';
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function addQuestion() {
    qId++;
    const qContainer = document.getElementById('questionsContainer');
    const qBlock = document.createElement('div');
    qBlock.className = 'question-block';
    qBlock.id = `qBlock_${qId}`;
    qBlock.innerHTML = `
        <table class="new-survey-table">
    <tr>
        <td>Question</td>
        <td>
            <input type="text" name="question_${qId}" placeholder="Enter Question">
            <span class="error" id="qError${qId}"></span>
        </td>
    </tr>
    <tr>
        <td>Question Type</td>
        <td>
            <table class="question-type-table">
                <tr>
                    <td>
                        <input type="radio" name="type_${qId}" value="Radio" checked>
                    </td>
                    <td>
                        <label>Radio Buttons</label>
                    </td>
                </tr>
                <tr>
                    <td>
                        <input type="radio" name="type_${qId}" value="Checkboxes">
                    </td>
                    <td>
                        <label>Checkboxes</label>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tbody id="aContainer_${qId}">
        <tr class="new-answer-row" id="aField_${qId}_1">
            <td>Answer</td>
            <td>
                <div class="answer-row">
                    <input type="text" name="answer_${qId}_1" placeholder="Enter Answer">
                    <button type="button" class="new-survey-btn" onclick="removeAnswer(${qId}, 1)">Remove Answer</button>
                </div>
                <span class="error" id="aError${qId}_1"></span>
            </td>
        </tr>
    </tbody>
</table>
<div class="question-buttons">
    <button type="button" class="new-survey-btn" onclick="addAnswerField(${qId})">Add Another Answer</button>
    <button type="button" class="new-survey-btn" onclick="removeQuestion(${qId})" id="removeQBtn${qId}">Remove Question</button>
</div>

    `;
    qContainer.appendChild(qBlock);
}

function removeQuestion(id) {
    const block = document.getElementById(`qBlock_${id}`);
    if (block) block.remove();
}

function addAnswerField(qId) {
    const aContainer = document.getElementById(`aContainer_${qId}`);
    const aCount = aContainer.querySelectorAll("tr[id^='aField_']").length + 1;
    const aRow = document.createElement('tr');
    aRow.className = 'new-answer-row'; 
    aRow.id = `aField_${qId}_${aCount}`;
    aRow.innerHTML = `
        <td>Answer</td>
        <td>
            <div class="answer-row">
                <input type="text" name="answer_${qId}_${aCount}" placeholder="Enter Answer">
                <button type="button" class="new-survey-btn" onclick="removeAnswer(${qId}, ${aCount})">Remove Answer</button>
            </div>
            <span class="error" id="aError${qId}_${aCount}"></span>
        </td>
    `;
    aContainer.appendChild(aRow);
}

function removeAnswer(qId, aId) {
    const aField = document.getElementById(`aField_${qId}_${aId}`);
    if (aField) aField.remove();
}

document.getElementById('surveyEditForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData(this);
    const jsonData = {};

    formData.forEach((value, key) => {
        const isQuestion = key.startsWith("question_");
        const isType = key.startsWith("type_");
        const isAnswer = key.startsWith("answer_");

        if (isQuestion || isType || isAnswer) {
            const [field, qNum, aNum] = key.split('_');

            if (!jsonData.questions) jsonData.questions = {};
            if (!jsonData.questions[qNum]) jsonData.questions[qNum] = { answers: {} };

            if (isQuestion) jsonData.questions[qNum].question = value;
            if (isType) jsonData.questions[qNum].type = value;
            if (isAnswer) jsonData.questions[qNum].answers[aNum] = value;
        } else {
            jsonData[key] = value;
        }
    });

    const surveyId = this.getAttribute('data-survey-id');

    fetch(getSurveyBasePath() + '/edit/' + surveyId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(jsonData)
    })
        .then(async response => {
            const data = await response.json().catch(() => ({}));
            if (response.ok) return data;
            throw new Error(data.message || 'Survey could not be updated.');
        })
        .then(data => {
            console.log('Success:', data);
            window.location.href = getSurveyBasePath() + '/';
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
});

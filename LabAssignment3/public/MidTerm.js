function loadDescription(projectId) {
    let filePath;

    // Map projectId to the correct text file
    if (projectId === 'project1') {
        filePath = 'semester1Project.txt';  // File for Project 1
    } else if (projectId === 'project2') {
        filePath = 'semester2Project.txt';  // File for Project 2
    }

    // Fetch the content of the file
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error('File not found');
            }
            return response.text();
        })
        .then(data => {
            // Display the content in the respective description div
            document.getElementById(`${projectId}-description`).innerHTML = `<p>${data}</p>`;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById(`${projectId}-description`).innerHTML = `<p>Could not load the description.</p>`;
        });
}

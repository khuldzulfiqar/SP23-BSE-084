document.getElementById('checkoutForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form submission
    let isValid = true;

    // Clear previous validation messages
    const inputs = this.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });

    // Check for empty fields
    inputs.forEach(input => {
        if (!input.value) {
            input.classList.add('is-invalid');
            isValid = false;
        }
    });

    // Check if checkbox is checked
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        termsCheckbox.classList.add('is-invalid');
        isValid = false;
    }

    // If the form is valid, you can proceed with further actions (e.g., submission)
    if (isValid) {
        alert('Form submitted successfully!');
    }
});
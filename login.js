document.getElementById('login-btn').addEventListener('click', async () => {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errMsg   = document.getElementById('error-msg');
    const btn      = document.getElementById('login-btn');

    btn.textContent = 'Logging in…';
    btn.disabled = true;
    errMsg.style.display = 'none';

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        errMsg.style.display = 'block';
        btn.textContent = 'Log In';
        btn.disabled = false;
    } else {
        window.location.href = 'index.html';
    }
});

// If already logged in, skip login page
db.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = 'index.html';
});
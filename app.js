// SecureTix PKI Application
// Main JavaScript file with cryptographic functions

// Email OTP (EmailJS) configuration
// Replace placeholders with your EmailJS values to enable real email OTP.
// Public key is safe to use in frontend code. Never put a private key in this project.
const EMAIL_OTP_CONFIG = {
    provider: 'emailjs',
    publicKey: 'LXsapereV8PFUckKa',
    serviceId: 'service_bfi65rn',
    templateId: 'template_n2w198h',
    appName: 'SecureTix',
    otpExpiryMinutes: 5,
    resendCooldownSeconds: 60,
    maxAttempts: 5,
    demoFallback: false
};

let emailOtpProviderInitialized = false;

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
        if (darkModeToggle) {
            darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        }
    }
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            body.classList.toggle('dark-mode');
            
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('darkMode', 'enabled');
                darkModeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
            } else {
                localStorage.setItem('darkMode', 'disabled');
                darkModeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
            }
        });
    }
    
    // Update navigation active state
    updateNavigation();
    
    // Initialize session check
    checkUserSession();

    // Initialize Email OTP provider (if configured)
    initEmailOtpProvider();
});

// Update navigation active state
function updateNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// Check if user is logged in
function checkUserSession() {
    const user = getCurrentUser();
    const navbarNav = document.querySelector('.navbar-nav');
    
    if (user && navbarNav) {
        // Update navigation for logged-in users
        const loginLink = navbarNav.querySelector('a[href="login.html"]');
        const registerLink = navbarNav.querySelector('a[href="register.html"]');
        const loginItem = loginLink ? loginLink.parentElement : null;
        const registerItem = registerLink ? registerLink.parentElement : null;
        
        if (loginItem) {
            loginItem.innerHTML = `<a class="nav-link" href="dashboard.html"><i class="bi bi-speedometer2"></i> Dashboard</a>`;
        }
        if (registerItem) {
            registerItem.innerHTML = `<a class="btn btn-outline-light ms-2" href="#" onclick="logout()">Logout</a>`;
        }
    }
}

// ============================================
// EMAIL OTP (EMAILJS + CLIENT-SIDE DEMO STORE)
// ============================================

function isEmailOtpConfigured() {
    return !!(
        EMAIL_OTP_CONFIG.publicKey &&
        EMAIL_OTP_CONFIG.serviceId &&
        EMAIL_OTP_CONFIG.templateId &&
        !EMAIL_OTP_CONFIG.publicKey.startsWith('YOUR_') &&
        !EMAIL_OTP_CONFIG.serviceId.startsWith('YOUR_') &&
        !EMAIL_OTP_CONFIG.templateId.startsWith('YOUR_')
    );
}

function initEmailOtpProvider() {
    if (emailOtpProviderInitialized) return;

    if (typeof emailjs === 'undefined') {
        return;
    }

    if (!isEmailOtpConfigured()) {
        return;
    }

    try {
        emailjs.init({
            publicKey: EMAIL_OTP_CONFIG.publicKey,
            limitRate: {
                id: 'securetix-otp',
                throttle: 1000
            }
        });
        emailOtpProviderInitialized = true;
    } catch (error) {
        console.warn('EmailJS init failed:', error);
    }
}

function getEmailOtpRequests() {
    const items = localStorage.getItem('emailOtpRequests');
    return items ? JSON.parse(items) : [];
}

function setEmailOtpRequests(items) {
    localStorage.setItem('emailOtpRequests', JSON.stringify(items));
}

function cleanupEmailOtpRequests() {
    const now = new Date();
    const validItems = getEmailOtpRequests().filter(item => {
        return !item.used && new Date(item.expiresAt) > now;
    });
    setEmailOtpRequests(validItems);
    return validItems;
}

function sha256Text(text) {
    const md = forge.md.sha256.create();
    md.update(String(text), 'utf8');
    return md.digest().toHex();
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildOtpEmailTemplateParams(email, otpCode, purpose, extraData) {
    const purposeLabel = purpose === 'register' ? 'Account Registration Verification' : 'PIN Reset Verification';
    const displayName = (extraData && extraData.userName) ? extraData.userName : 'User';

    return {
        // Delivery / generic vars
        to_email: email,
        otp_code: otpCode,
        otp_purpose: purposeLabel,
        app_name: EMAIL_OTP_CONFIG.appName,
        expiry_minutes: EMAIL_OTP_CONFIG.otpExpiryMinutes,
        user_name: displayName,

        // Template-specific vars for user's EmailJS HTML template
        user_email: email,
        to_name: displayName,
        action_type: purposeLabel,
        sent_time: new Date().toLocaleString(),
        support_url: 'mailto:support@securetix.com',
        verify_url: new URL('login.html', window.location.href).href
    };
}

async function sendOtpEmail(email, otpCode, purpose, extraData) {
    initEmailOtpProvider();

    if (isEmailOtpConfigured() && typeof emailjs !== 'undefined') {
        const templateParams = buildOtpEmailTemplateParams(email, otpCode, purpose, extraData || {});
        await emailjs.send(
            EMAIL_OTP_CONFIG.serviceId,
            EMAIL_OTP_CONFIG.templateId,
            templateParams
        );
        return {
            delivery: 'emailjs'
        };
    }

    if (EMAIL_OTP_CONFIG.demoFallback) {
        return {
            delivery: 'demo',
            demoCode: otpCode
        };
    }

    throw new Error('Email OTP is not configured. Add EmailJS keys in app.js first.');
}

function findLatestOtpRequest(purpose, email) {
    const items = getEmailOtpRequests()
        .filter(item => item.purpose === purpose && item.email === email)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return items[0] || null;
}

async function requestEmailOtpCode(purpose, email, extraData) {
    if (!email) {
        throw new Error('Email is required');
    }

    cleanupEmailOtpRequests();

    const items = getEmailOtpRequests();
    const existing = findLatestOtpRequest(purpose, email);
    const now = new Date();

    if (existing && existing.cooldownUntil && new Date(existing.cooldownUntil) > now) {
        const secondsLeft = Math.ceil((new Date(existing.cooldownUntil) - now) / 1000);
        throw new Error('Please wait ' + secondsLeft + 's before requesting another code.');
    }

    // Remove older requests for same purpose+email (single active OTP policy)
    const filtered = items.filter(item => !(item.purpose === purpose && item.email === email));

    const otpCode = generateOtpCode();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + EMAIL_OTP_CONFIG.otpExpiryMinutes * 60 * 1000).toISOString();
    const cooldownUntil = new Date(Date.now() + EMAIL_OTP_CONFIG.resendCooldownSeconds * 1000).toISOString();

    const record = {
        id: 'otp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8),
        purpose: purpose,
        email: email,
        codeHash: sha256Text(otpCode),
        attempts: 0,
        maxAttempts: EMAIL_OTP_CONFIG.maxAttempts,
        createdAt: createdAt,
        expiresAt: expiresAt,
        cooldownUntil: cooldownUntil,
        used: false
    };

    filtered.push(record);
    setEmailOtpRequests(filtered);

    try {
        const deliveryInfo = await sendOtpEmail(email, otpCode, purpose, extraData || {});

        logAuditEvent('EMAIL_OTP_REQUESTED', 'system', {
            purpose: purpose,
            email: email,
            delivery: deliveryInfo.delivery
        });

        return {
            requestId: record.id,
            purpose: purpose,
            email: email,
            expiresAt: expiresAt,
            cooldownUntil: cooldownUntil,
            delivery: deliveryInfo.delivery,
            demoCode: deliveryInfo.demoCode || null
        };
    } catch (error) {
        setEmailOtpRequests(getEmailOtpRequests().filter(item => item.id !== record.id));
        throw new Error('Failed to send verification code: ' + error.message);
    }
}

function verifyAndConsumeEmailOtpCode(purpose, email, otpCode) {
    if (!otpCode || !/^\d{6}$/.test(String(otpCode))) {
        throw new Error('Verification code must be 6 digits');
    }

    const items = getEmailOtpRequests();
    const index = items
        .map((item, i) => ({ item, i }))
        .filter(pair => pair.item.purpose === purpose && pair.item.email === email)
        .sort((a, b) => new Date(b.item.createdAt) - new Date(a.item.createdAt))[0];

    if (!index) {
        throw new Error('No active verification request found. Please request a new code.');
    }

    const record = index.item;
    const now = new Date();

    if (record.used) {
        throw new Error('This verification code was already used.');
    }

    if (now > new Date(record.expiresAt)) {
        items.splice(index.i, 1);
        setEmailOtpRequests(items);
        throw new Error('Verification code has expired. Please request a new code.');
    }

    if (record.attempts >= record.maxAttempts) {
        items.splice(index.i, 1);
        setEmailOtpRequests(items);
        throw new Error('Too many failed attempts. Please request a new code.');
    }

    if (record.codeHash !== sha256Text(String(otpCode))) {
        record.attempts += 1;
        if (record.attempts >= record.maxAttempts) {
            items.splice(index.i, 1);
        } else {
            items[index.i] = record;
        }
        setEmailOtpRequests(items);
        throw new Error('Invalid verification code');
    }

    record.used = true;
    items[index.i] = record;
    setEmailOtpRequests(items.filter(item => !item.used));

    logAuditEvent('EMAIL_OTP_VERIFIED', 'system', {
        purpose: purpose,
        email: email
    });

    return true;
}

// ============================================
// PKI CRYPTOGRAPHIC FUNCTIONS
// ============================================

// Generate RSA Key Pair (2048-bit)
async function generateKeyPair() {
    try {
        const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
        return {
            privateKey: forge.pki.privateKeyToPem(keyPair.privateKey),
            publicKey: forge.pki.publicKeyToPem(keyPair.publicKey)
        };
    } catch (error) {
        console.error('Error generating key pair:', error);
        throw error;
    }
}

// Generate X.509 Certificate
function generateCertificate(publicKeyPem, privateKeyPem, userInfo) {
    try {
        const keys = {
            privateKey: forge.pki.privateKeyFromPem(privateKeyPem),
            publicKey: forge.pki.publicKeyFromPem(publicKeyPem)
        };
        
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = generateSerialNumber();
        
        // Certificate validity
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
        
        // Certificate attributes
        const attrs = [{
            name: 'commonName',
            value: userInfo.name || 'SecureTix User'
        }, {
            name: 'countryName',
            value: userInfo.country || 'US'
        }, {
            shortName: 'ST',
            value: userInfo.state || 'CA'
        }, {
            name: 'localityName',
            value: userInfo.city || 'San Francisco'
        }, {
            name: 'organizationName',
            value: 'SecureTix'
        }, {
            shortName: 'OU',
            value: 'User Certificate'
        }, {
            name: 'emailAddress',
            value: userInfo.email
        }];
        
        cert.setSubject(attrs);
        
        // Self-signed certificate (simulated CA)
        const caAttrs = [{
            name: 'commonName',
            value: 'SecureTix Certificate Authority'
        }, {
            name: 'countryName',
            value: 'US'
        }, {
            name: 'organizationName',
            value: 'SecureTix CA'
        }];
        
        cert.setIssuer(caAttrs);
        
        // Extensions
        cert.setExtensions([{
            name: 'basicConstraints',
            cA: false
        }, {
            name: 'keyUsage',
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true
        }, {
            name: 'extKeyUsage',
            clientAuth: true,
            emailProtection: true
        }, {
            name: 'subjectAltName',
            altNames: [{
                type: 6, // URI
                value: 'https://securetix.com/user/' + userInfo.email
            }, {
                type: 1, // email
                value: userInfo.email
            }]
        }]);
        
        // Sign certificate
        cert.sign(keys.privateKey, forge.md.sha256.create());
        
        return forge.pki.certificateToPem(cert);
    } catch (error) {
        console.error('Error generating certificate:', error);
        throw error;
    }
}

// Generate random serial number
function generateSerialNumber() {
    return Math.floor(Math.random() * 1000000000).toString(16);
}

// Validate Certificate
function validateCertificate(certPem) {
    try {
        const cert = forge.pki.certificateFromPem(certPem);
        const now = new Date();
        
        // Check validity period
        if (now < cert.validity.notBefore || now > cert.validity.notAfter) {
            return {
                valid: false,
                reason: 'Certificate has expired or is not yet valid'
            };
        }
        
        // Check if certificate is in revocation list
        const revokedCerts = getRevokedCertificates();
        if (revokedCerts.some(r => r.serialNumber === cert.serialNumber)) {
            return {
                valid: false,
                reason: 'Certificate has been revoked'
            };
        }

        const trustedUser = getUsers().find(u => u.certificate === certPem);
        if (!trustedUser) {
            return {
                valid: false,
                reason: 'Certificate is not in trusted certificate store'
            };
        }

        // Verify signature (simplified for self-signed)
        try {
            const verified = cert.verify(cert);
            if (!verified) {
                return {
                    valid: false,
                    reason: 'Certificate signature verification failed'
                };
            }
        } catch (e) {
            // For self-signed certs, this might fail but we accept it in demo
            console.log('Self-signed certificate accepted');
        }
        
        return {
            valid: true,
            certificate: cert,
            subject: cert.subject.attributes.reduce((acc, attr) => {
                acc[attr.name || attr.shortName] = attr.value;
                return acc;
            }, {}),
            issuer: cert.issuer.attributes.reduce((acc, attr) => {
                acc[attr.name || attr.shortName] = attr.value;
                return acc;
            }, {}),
            serialNumber: cert.serialNumber,
            notBefore: cert.validity.notBefore,
            notAfter: cert.validity.notAfter
        };
    } catch (error) {
        return {
            valid: false,
            reason: 'Invalid certificate format: ' + error.message
        };
    }
}

// Sign Data (Ticket)
function signData(data, privateKeyPem) {
    try {
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const md = forge.md.sha256.create();
        md.update(JSON.stringify(data), 'utf8');
        
        const signature = privateKey.sign(md);
        return forge.util.encode64(signature);
    } catch (error) {
        console.error('Error signing data:', error);
        throw error;
    }
}

// Verify Signature
function verifySignature(data, signature, publicKeyPem) {
    try {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        const md = forge.md.sha256.create();
        md.update(JSON.stringify(data), 'utf8');
        
        const signatureBytes = forge.util.decode64(signature);
        return publicKey.verify(md.digest().bytes(), signatureBytes);
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
}

// Encrypt Data (Hybrid: AES + RSA)
function encryptData(data, publicKeyPem) {
    try {
        // Generate random AES key
        const aesKey = forge.random.getBytesSync(32); // 256-bit key
        const iv = forge.random.getBytesSync(16);
        
        // Encrypt data with AES
        const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
        cipher.start({ iv: iv });
        cipher.update(forge.util.createBuffer(JSON.stringify(data), 'utf8'));
        cipher.finish();
        
        const encrypted = cipher.output;
        
        // Encrypt AES key with RSA
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        const encryptedKey = publicKey.encrypt(aesKey, 'RSA-OAEP', {
            md: forge.md.sha256.create()
        });
        
        return {
            encryptedData: forge.util.encode64(encrypted.bytes()),
            encryptedKey: forge.util.encode64(encryptedKey),
            iv: forge.util.encode64(iv)
        };
    } catch (error) {
        console.error('Error encrypting data:', error);
        throw error;
    }
}

// Decrypt Data
function decryptData(encryptedPackage, privateKeyPem) {
    try {
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        
        // Decrypt AES key with RSA
        const encryptedKey = forge.util.decode64(encryptedPackage.encryptedKey);
        const aesKey = privateKey.decrypt(encryptedKey, 'RSA-OAEP', {
            md: forge.md.sha256.create()
        });
        
        // Decrypt data with AES
        const iv = forge.util.decode64(encryptedPackage.iv);
        const encryptedData = forge.util.decode64(encryptedPackage.encryptedData);
        
        const decipher = forge.cipher.createDecipher('AES-CBC', aesKey);
        decipher.start({ iv: iv });
        decipher.update(forge.util.createBuffer(encryptedData));
        decipher.finish();
        
        return JSON.parse(decipher.output.toString());
    } catch (error) {
        console.error('Error decrypting data:', error);
        throw error;
    }
}

// Hash Data (SHA-256)
function hashData(data) {
    const md = forge.md.sha256.create();
    md.update(JSON.stringify(data), 'utf8');
    return md.digest().toHex();
}

// ============================================
// USER MANAGEMENT
// ============================================

async function requestRegistrationVerificationCode(userInfo) {
    const users = getUsers();
    if (users.find(u => u.email === userInfo.email)) {
        throw new Error('User with this email already exists');
    }

    return await requestEmailOtpCode('register', userInfo.email, {
        userName: userInfo.name || 'User'
    });
}

function verifyRegistrationCode(email, code) {
    return verifyAndConsumeEmailOtpCode('register', email, code);
}

async function requestPinResetCode(email) {
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        throw new Error('User not found');
    }

    const result = await requestEmailOtpCode('pin_reset', email, {
        userName: user.name || 'User'
    });

    logAuditEvent('PIN_RESET_CODE_REQUESTED', user.id, { email: user.email });
    return result;
}

function resetPinWithVerificationCode(email, code, newPin) {
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        throw new Error('User not found');
    }

    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
        throw new Error('PIN must be 4 to 6 digits');
    }

    verifyAndConsumeEmailOtpCode('pin_reset', email, code);

    // Revoke old certificate (credential recovery = new cert issued)
    try {
        const oldCert = forge.pki.certificateFromPem(user.certificate);
        revokeCertificate(oldCert.serialNumber, 'Credential recovery / PIN reset');
    } catch (e) {
        console.warn('Unable to revoke old certificate during PIN reset:', e);
    }

    // Cancel active tickets to avoid trust mismatch after credential reissue
    if (user.tickets && Array.isArray(user.tickets)) {
        user.tickets.forEach(ticket => {
            if (ticket.status === 'valid') {
                ticket.status = 'cancelled';
                ticket.cancelledAt = new Date().toISOString();
            }
        });
    }

    const keyPair = generateKeyPairSync();
    const newCertificate = generateCertificate(keyPair.publicKey, keyPair.privateKey, user);
    const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, newPin);

    user.publicKey = keyPair.publicKey;
    user.privateKey = encryptedPrivateKey;
    user.certificate = newCertificate;
    user.credentialsResetAt = new Date().toISOString();

    updateUser(user);

    logAuditEvent('PIN_RESET_COMPLETED', user.id, {
        email: user.email,
        credentialReissued: true
    });

    return user;
}

// Register User
function registerUser(userInfo, pin) {
    try {
        // Check if user already exists
        const users = getUsers();
        if (users.find(u => u.email === userInfo.email)) {
            throw new Error('User with this email already exists');
        }
        
        // Generate key pair
        const keyPair = generateKeyPairSync();
        
        // Generate certificate
        const certificate = generateCertificate(
            keyPair.publicKey,
            keyPair.privateKey,
            userInfo
        );
        
        // Encrypt private key with PIN
        const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, pin);
        
        // Create user object
        const user = {
            id: generateUserId(),
            name: userInfo.name,
            email: userInfo.email,
            publicKey: keyPair.publicKey,
            privateKey: encryptedPrivateKey,
            certificate: certificate,
            registeredAt: new Date().toISOString(),
            tickets: []
        };
        
        // Save user
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Log audit event
        logAuditEvent('USER_REGISTERED', user.id, { email: user.email });
        
        return user;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}

// Synchronous key pair generation for registration
function generateKeyPairSync() {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 });
    return {
        privateKey: forge.pki.privateKeyToPem(keyPair.privateKey),
        publicKey: forge.pki.publicKeyToPem(keyPair.publicKey)
    };
}

// Encrypt private key with PIN
function encryptPrivateKey(privateKeyPem, pin) {
    const salt = forge.random.getBytesSync(16);
    const key = forge.pkcs5.pbkdf2(pin, salt, 10000, 32);
    const iv = forge.random.getBytesSync(16);
    
    const cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(privateKeyPem, 'utf8'));
    cipher.finish();
    
    return {
        encrypted: forge.util.encode64(cipher.output.bytes()),
        salt: forge.util.encode64(salt),
        iv: forge.util.encode64(iv)
    };
}

// Decrypt private key with PIN
function decryptPrivateKey(encryptedData, pin) {
    try {
        const salt = forge.util.decode64(encryptedData.salt);
        const key = forge.pkcs5.pbkdf2(pin, salt, 10000, 32);
        const iv = forge.util.decode64(encryptedData.iv);
        const encrypted = forge.util.decode64(encryptedData.encrypted);
        
        const decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({ iv: iv });
        decipher.update(forge.util.createBuffer(encrypted));
        
        if (!decipher.finish()) {
            throw new Error('Incorrect PIN');
        }
        
        return decipher.output.toString();
    } catch (error) {
        throw new Error('Failed to decrypt private key. Incorrect PIN?');
    }
}

// Login User
function loginUser(email, pin) {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    // Validate certificate
    const certValidation = validateCertificate(user.certificate);
    if (!certValidation.valid) {
        throw new Error('Certificate validation failed: ' + certValidation.reason);
    }
    
    // Try to decrypt private key (validates PIN)
    try {
        decryptPrivateKey(user.privateKey, pin);
    } catch (error) {
        throw new Error('Invalid PIN');
    }
    
    // Set current session
    sessionStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        email: user.email,
        pin: pin // Stored in session only
    }));
    
    // Log audit event
    logAuditEvent('USER_LOGIN', user.id, { email: user.email });
    
    return user;
}

// Logout User
function logout() {
    const user = getCurrentUser();
    if (user) {
        logAuditEvent('USER_LOGOUT', user.id, { email: user.email });
    }
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Get current logged-in user
function getCurrentUser() {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (!sessionUser) return null;
    
    const session = JSON.parse(sessionUser);
    const users = getUsers();
    return users.find(u => u.id === session.id);
}

// Get users from storage
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Update user
function updateUser(updatedUser) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
        users[index] = updatedUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Generate user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// EVENT MANAGEMENT
// ============================================

// Get all events
function getEvents() {
    return [
        {
            id: 'event_1',
            title: 'Summer Music Festival 2024',
            category: 'Music',
            location: 'Golden Gate Park, San Francisco',
            date: 'July 15-17, 2024',
            price: 299,
            description: 'Three days of incredible music featuring top artists from around the world.',
            image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
            availableTickets: 5000
        },
        {
            id: 'event_2',
            title: 'NBA Finals Game 7',
            category: 'Sports',
            location: 'Chase Center, San Francisco',
            date: 'June 20, 2024',
            price: 850,
            description: 'Witness basketball history in the making at the decisive Game 7.',
            image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
            availableTickets: 1200
        },
        {
            id: 'event_3',
            title: 'Tech Innovation Summit',
            category: 'Conference',
            location: 'Moscone Center, San Francisco',
            date: 'August 5-7, 2024',
            price: 599,
            description: 'Leading tech conference featuring keynotes from industry pioneers.',
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
            availableTickets: 3000
        },
        {
            id: 'event_4',
            title: 'Broadway Musical: Hamilton',
            category: 'Theater',
            location: 'Orpheum Theatre, San Francisco',
            date: 'September 10, 2024',
            price: 175,
            description: 'The revolutionary story of Alexander Hamilton comes to life on stage.',
            image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=600&fit=crop',
            availableTickets: 800
        },
        {
            id: 'event_5',
            title: 'Food & Wine Festival',
            category: 'Food',
            location: 'Pier 39, San Francisco',
            date: 'October 1-3, 2024',
            price: 125,
            description: 'Taste creations from renowned chefs and sample premium wines.',
            image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop',
            availableTickets: 2000
        },
        {
            id: 'event_6',
            title: 'Electronic Dance Music Night',
            category: 'Music',
            location: 'Bill Graham Civic Auditorium',
            date: 'November 12, 2024',
            price: 89,
            description: 'Dance the night away with world-famous DJs and stunning visuals.',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
            availableTickets: 4000
        }
    ];
}

// Get event by ID
function getEventById(eventId) {
    return getEvents().find(e => e.id === eventId);
}

// ============================================
// TICKET MANAGEMENT
// ============================================

// Purchase Ticket
function purchaseTicket(eventId, pin) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }
    
    const event = getEventById(eventId);
    if (!event) {
        throw new Error('Event not found');
    }
    
    // Get private key
    const privateKeyPem = decryptPrivateKey(user.privateKey, pin);
    
    // Create ticket data
    const ticketData = {
        ticketId: generateTicketId(),
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        price: event.price,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        purchaseDate: new Date().toISOString(),
        status: 'valid'
    };
    
    // Sign ticket
    const signature = signData(ticketData, privateKeyPem);
    
    // Encrypt ticket for transmission
    const encryptedTicket = encryptData(ticketData, user.publicKey);
    
    // Create ticket object
    const ticket = {
        ...ticketData,
        signature: signature,
        hash: hashData(ticketData),
        encryptedData: encryptedTicket,
        certificate: user.certificate
    };
    
    // Add to user's tickets
    user.tickets.push(ticket);
    updateUser(user);
    
    // Log audit event
    logAuditEvent('TICKET_PURCHASED', user.id, {
        ticketId: ticket.ticketId,
        eventId: event.id
    });
    
    return ticket;
}

// Cancel Ticket (user can cancel anytime)
function cancelTicket(ticketId) {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not logged in');
    }

    const ticket = user.tickets.find(t => t.ticketId === ticketId);
    if (!ticket) {
        throw new Error('Ticket not found');
    }

    if (ticket.status === 'cancelled') {
        throw new Error('Ticket is already cancelled');
    }

    ticket.status = 'cancelled';
    ticket.cancelledAt = new Date().toISOString();

    updateUser(user);

    logAuditEvent('TICKET_CANCELLED', user.id, {
        ticketId: ticket.ticketId,
        eventId: ticket.eventId
    });

    return ticket;
}

// Verify Ticket
function verifyTicket(ticket, publicKeyPem) {
    try {
        // Check latest stored status first (prevents old downloaded JSON from bypassing cancellation)
        const users = getUsers();
        let storedTicket = null;
        for (const u of users) {
            if (u.tickets && Array.isArray(u.tickets)) {
                const match = u.tickets.find(t => t.ticketId === ticket.ticketId);
                if (match) {
                    storedTicket = match;
                    break;
                }
            }
        }

        if (storedTicket && storedTicket.status === 'cancelled') {
            return {
                valid: false,
                reason: 'Ticket status: cancelled'
            };
        }

        if (ticket.status === 'cancelled') {
            return {
                valid: false,
                reason: 'Ticket status: cancelled'
            };
        }

        // Verify signature
        const ticketData = {
            ticketId: ticket.ticketId,
            eventId: ticket.eventId,
            eventTitle: ticket.eventTitle,
            eventDate: ticket.eventDate,
            eventLocation: ticket.eventLocation,
            price: ticket.price,
            userId: ticket.userId,
            userName: ticket.userName,
            userEmail: ticket.userEmail,
            purchaseDate: ticket.purchaseDate,
            status: ticket.status
        };
        
        const trustedUser = getUsers().find(u => u.certificate === ticket.certificate);
        const signatureKeyPem = trustedUser ? trustedUser.publicKey : publicKeyPem;
        const signatureValid = verifySignature(ticketData, ticket.signature, signatureKeyPem);
        
        if (!signatureValid) {
            return {
                valid: false,
                reason: 'Invalid signature - ticket may be forged'
            };
        }
        
        // Verify hash integrity
        const currentHash = hashData(ticketData);
        if (currentHash !== ticket.hash) {
            return {
                valid: false,
                reason: 'Data integrity check failed - ticket has been tampered with'
            };
        }
        
        // Validate certificate
        const certValidation = validateCertificate(ticket.certificate);
        if (!certValidation.valid) {
            return {
                valid: false,
                reason: 'Certificate validation failed: ' + certValidation.reason
            };
        }
        
        // Check ticket status
        if (ticket.status !== 'valid') {
            return {
                valid: false,
                reason: 'Ticket status: ' + ticket.status
            };
        }
        
        return {
            valid: true,
            ticket: ticketData,
            verifiedAt: new Date().toISOString()
        };
    } catch (error) {
        return {
            valid: false,
            reason: 'Verification error: ' + error.message
        };
    }
}

// Generate ticket ID
function generateTicketId() {
    return 'TIX' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// ============================================
// CERTIFICATE REVOCATION
// ============================================

// Revoke Certificate
function revokeCertificate(serialNumber, reason) {
    const revokedList = getRevokedCertificates();
    
    if (!revokedList.find(r => r.serialNumber === serialNumber)) {
        revokedList.push({
            serialNumber: serialNumber,
            revokedAt: new Date().toISOString(),
            reason: reason
        });
        
        localStorage.setItem('revokedCertificates', JSON.stringify(revokedList));
        
        // Log audit event
        logAuditEvent('CERTIFICATE_REVOKED', 'system', {
            serialNumber: serialNumber,
            reason: reason
        });
    }
}

// Get revoked certificates
function getRevokedCertificates() {
    const revoked = localStorage.getItem('revokedCertificates');
    return revoked ? JSON.parse(revoked) : [];
}

// ============================================
// AUDIT LOGGING
// ============================================

// Log audit event
function logAuditEvent(eventType, userId, details) {
    const logs = getAuditLogs();
    
    logs.push({
        id: 'log_' + Date.now(),
        eventType: eventType,
        userId: userId,
        timestamp: new Date().toISOString(),
        details: details
    });
    
    // Keep only last 1000 logs
    if (logs.length > 1000) {
        logs.shift();
    }
    
    localStorage.setItem('auditLogs', JSON.stringify(logs));
}

// Get audit logs
function getAuditLogs() {
    const logs = localStorage.getItem('auditLogs');
    return logs ? JSON.parse(logs) : [];
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

// Default admin credentials (hashed)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    // Password is "SecureAdmin2024!" - hashed with SHA-256
    passwordHash: '3597aeac2fb4b51cae61086a1dfa0dd1b8b060b1616147006d77ddcd02e37f84'
};

// Check if user is admin
function isAdmin() {
    const adminSession = sessionStorage.getItem('adminAuth');
    if (!adminSession) return false;
    
    try {
        const session = JSON.parse(adminSession);
        const now = Date.now();
        
        // Session expires after 30 minutes
        if (now - session.timestamp > 30 * 60 * 1000) {
            sessionStorage.removeItem('adminAuth');
            return false;
        }
        
        return session.authenticated === true;
    } catch (error) {
        return false;
    }
}

// Admin login
function adminLogin(username, password) {
    // Hash the password
    const md = forge.md.sha256.create();
    md.update(password);
    const passwordHash = md.digest().toHex();
    
    // Verify credentials
    if (username === ADMIN_CREDENTIALS.username && passwordHash === ADMIN_CREDENTIALS.passwordHash) {
        const session = {
            authenticated: true,
            timestamp: Date.now(),
            username: username
        };
        
        sessionStorage.setItem('adminAuth', JSON.stringify(session));
        
        // Log admin login
        logAuditEvent('ADMIN_LOGIN', 'admin', { username: username });
        
        return true;
    }
    
    // Log failed attempt
    logAuditEvent('ADMIN_LOGIN_FAILED', 'system', { username: username });
    
    return false;
}

// Admin logout
function adminLogout() {
    logAuditEvent('ADMIN_LOGOUT', 'admin', {});
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'index.html';
}

// Require admin access for page
function requireAdmin() {
    if (!isAdmin()) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Show loading spinner
function showLoading(show = true) {
    let spinner = document.getElementById('loadingSpinner');
    
    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loadingSpinner';
            spinner.className = 'position-fixed top-50 start-50 translate-middle';
            spinner.style.zIndex = '9999';
            spinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.body.appendChild(spinner);
        }
    } else {
        if (spinner) {
            spinner.remove();
        }
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Download as JSON file
function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateKeyPair,
        generateCertificate,
        validateCertificate,
        signData,
        verifySignature,
        encryptData,
        decryptData,
        hashData
    };
}

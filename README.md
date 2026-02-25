# SecureTix - PKI-Based Secure Event Ticketing System

A complete, professional web application demonstrating Public Key Infrastructure (PKI) technology for secure event ticketing. This system implements cryptographic security principles including digital certificates, digital signatures, encryption, and non-repudiation.

## 🔐 Features

### Core PKI Features
- **RSA-2048 Key Pair Generation**: Asymmetric cryptography for each user
- **X.509 Digital Certificates**: Industry-standard certificates issued by simulated CA
- **Digital Signatures**: Tickets signed with private keys for authenticity
- **Signature Verification**: Public key verification of ticket validity
- **Hybrid Encryption**: AES-256 + RSA-2048 for secure transmission
- **Certificate Revocation List (CRL)**: Support for certificate revocation
- **Audit Logging**: Complete transaction history
- **Non-Repudiation**: Cryptographic proof of ticket ownership

### Application Features
- **User Registration**: Generate key pairs and receive certificates
- **Secure Login**: Certificate validation and PIN-based authentication
- **Event Browsing**: Search and filter events by category
- **Ticket Purchase**: Cryptographically sign and encrypt tickets
- **Ticket Verification**: Validate ticket authenticity
- **User Dashboard**: Manage tickets and certificates
- **Admin Panel**: CA management, certificate revocation, audit logs
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly Bootstrap 5 layout

## 📁 File Structure

```
SecureTix/
├── index.html          # Home page with hero section
├── register.html       # User registration with key generation
├── login.html          # Secure authentication
├── events.html         # Event listings and purchase
├── dashboard.html      # User dashboard
├── how-it-works.html   # Educational page on PKI
├── about.html          # About the system
├── contact.html        # Contact form and FAQ
├── admin-login.html    # Secure admin authentication
├── admin.html          # Admin/CA panel (requires auth)
├── styles.css          # Main stylesheet
├── app.js              # Core PKI and application logic
└── README.md           # This file
```

## 🚀 Setup Instructions

### Option 1: Live Server (Recommended)
1. Install the Live Server extension in VS Code
2. Open the project folder
3. Right-click on `index.html`
4. Select "Open with Live Server"
5. The app will open at `http://localhost:5500`

### Option 2: Python HTTP Server
```bash
cd SecureTix
python -m http.server 8000
# Visit http://localhost:8000
```

### Option 3: Node.js HTTP Server
```bash
cd SecureTix
npx http-server
# Visit http://localhost:8080
```

## 🔧 Technologies Used

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Bootstrap 5**: Responsive framework
- **Bootstrap Icons**: Icon library
- **JavaScript (ES6+)**: Application logic

### Cryptographic Libraries
- **Forge.js**: Comprehensive PKI implementation
  - RSA key generation and operations
  - X.509 certificate creation
  - Digital signatures (SHA-256 with RSA)
  - AES-CBC encryption
  - PBKDF2 key derivation

### Storage
- **LocalStorage**: User data and certificates
- **SessionStorage**: Current user session

## 📖 How to Use

### 1. Register an Account
1. Navigate to the **Register** page
2. Fill in your details (name, email, country, city)
3. Create a 6-digit PIN (this protects your private key)
4. Click "Register & Generate Certificate"
5. System will:
   - Generate RSA-2048 key pair
   - Create X.509 certificate
   - Encrypt private key with your PIN
   - Store certificate in browser

### 2. Login
1. Go to the **Login** page
2. Enter your email and PIN
3. System validates:
   - Certificate against CA
   - PIN by attempting private key decryption
   - Certificate expiration and revocation status

### 3. Purchase Tickets
1. Browse **Events** page
2. Click "Buy Ticket" on desired event
3. Enter your PIN to sign the ticket
4. System will:
   - Create ticket data structure
   - Sign ticket with your private key
   - Encrypt ticket for transmission
   - Calculate hash for integrity
   - Store in your dashboard

### 4. View & Manage Tickets
1. Access your **Dashboard**
2. View all purchased tickets
3. Click "View Details" to see full ticket information
4. Download tickets as JSON files
5. Export your certificate

### 5. Verify Tickets
1. In Dashboard, click "Verify Ticket"
2. Upload a ticket JSON file
3. System verifies:
   - Digital signature validity
   - Data integrity (hash check)
   - Certificate validity
   - Revocation status

### 6. Admin Panel
1. Navigate to **Admin Login** page (admin-login.html)
2. Enter admin credentials:
   - **Username:** admin
   - **Password:** SecureAdmin2024!
3. System validates credentials with SHA-256 hashing
4. Session expires after 30 minutes of inactivity
5. View all users and certificates
6. Check audit logs
7. Revoke certificates if needed
8. Monitor system activity

**Security Features:**
- Password is hashed with SHA-256
- Maximum 5 login attempts before 5-minute lockout
- Session-based authentication with timeout
- All admin actions are logged in audit trail

## 🔒 Security Implementation

### Admin Access Security
```javascript
// Admin credentials stored as SHA-256 hash
const ADMIN_CREDENTIALS = {
    username: 'admin',
    passwordHash: 'f8c3d4e5...' // SHA-256 of "SecureAdmin2024!"
};

// Session-based authentication with timeout
function isAdmin() {
    const session = sessionStorage.getItem('adminAuth');
    // Session expires after 30 minutes
    if (now - session.timestamp > 30 * 60 * 1000) {
        return false;
    }
    return true;
}
```

**Admin Security Features:**
- Password stored as SHA-256 hash (never plaintext)
- 5 failed login attempts trigger 5-minute account lockout
- Session expires after 30 minutes of inactivity
- All admin actions logged in audit trail
- Protected routes redirect to login if not authenticated

### Key Generation
```javascript
// RSA-2048 key pair generation
const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
```

### Certificate Creation
```javascript
// X.509 certificate with 1-year validity
const cert = forge.pki.createCertificate();
cert.publicKey = publicKey;
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date() + 1 year;
cert.sign(privateKey, forge.md.sha256.create());
```

### Digital Signing
```javascript
// Sign ticket with SHA-256 + RSA
const md = forge.md.sha256.create();
md.update(JSON.stringify(ticketData));
const signature = privateKey.sign(md);
```

### Signature Verification
```javascript
// Verify signature with public key
const verified = publicKey.verify(
    md.digest().bytes(),
    signature
);
```

### Hybrid Encryption
```javascript
// 1. Generate random AES key
const aesKey = forge.random.getBytesSync(32);

// 2. Encrypt data with AES-256
const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
cipher.update(data);

// 3. Encrypt AES key with RSA
const encryptedKey = publicKey.encrypt(aesKey, 'RSA-OAEP');
```

## 📊 Data Structures

### User Object
```javascript
{
  id: "user_xxx",
  name: "John Doe",
  email: "john@example.com",
  publicKey: "-----BEGIN PUBLIC KEY-----...",
  privateKey: { encrypted: "...", salt: "...", iv: "..." },
  certificate: "-----BEGIN CERTIFICATE-----...",
  registeredAt: "2024-01-01T00:00:00.000Z",
  tickets: []
}
```

### Ticket Object
```javascript
{
  ticketId: "TIXxxx",
  eventId: "event_1",
  eventTitle: "Concert",
  userId: "user_xxx",
  userName: "John Doe",
  price: 100,
  purchaseDate: "2024-01-01T00:00:00.000Z",
  signature: "base64_signature",
  hash: "sha256_hash",
  encryptedData: { encryptedData: "...", encryptedKey: "...", iv: "..." },
  certificate: "-----BEGIN CERTIFICATE-----...",
  status: "valid"
}
```

## 🎯 Educational Value

This project demonstrates:

1. **Authentication**: Certificate-based user authentication
2. **Authorization**: PIN-protected private key access
3. **Confidentiality**: AES encryption for data privacy
4. **Integrity**: SHA-256 hashing for tamper detection
5. **Non-Repudiation**: Digital signatures prove ownership
6. **Certificate Management**: Issuance, validation, revocation
7. **Public Key Infrastructure**: Complete PKI ecosystem simulation

## 🛡️ Attack Mitigation

| Attack Type | Prevention Method |
|-------------|------------------|
| Ticket Forgery | RSA signatures - only valid private key can sign |
| Data Tampering | SHA-256 hash verification detects modifications |
| Replay Attacks | Unique ticket IDs and timestamps |
| Man-in-the-Middle | Hybrid encryption protects transmission |
| Impersonation | Certificate validation binds identity |
| Key Compromise | Revocation list allows certificate invalidation |

## 🔄 Workflow Diagram

```
Registration:
User → Generate Keys → Create Certificate → Encrypt Private Key → Store

Purchase:
Select Event → Enter PIN → Sign Ticket → Encrypt Ticket → Store

Verification:
Upload Ticket → Validate Certificate → Verify Signature → Check Hash → Result
```

## ⚠️ Important Notes

- **Demo System**: This is a demonstration/educational project
- **Browser Storage**: Data stored in browser LocalStorage (clear on browser data clear)
- **No Backend**: All cryptography happens client-side
- **Simulated CA**: Certificate Authority is simulated, not a real trusted CA
- **PIN Security**: Store your PIN securely - cannot be recovered if forgotten

## 🎓 Use Cases

This PKI ticketing system can be adapted for:
- Event ticketing (concerts, sports, conferences)
- Document signing and verification
- Secure communications
- Digital identity management
- Supply chain authentication
- Healthcare record protection
- Financial transaction verification

## 📝 Browser Compatibility

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled and LocalStorage support.

## 🤝 Credits

- **Forge.js**: PKI and cryptography library
- **Bootstrap 5**: UI framework
- **Bootstrap Icons**: Icon library
- **Unsplash**: Event images (example URLs)

## 📄 License

This is an educational project. Free to use for learning purposes.

## 🔗 Additional Resources

- [RFC 5280](https://tools.ietf.org/html/rfc5280) - X.509 Certificate Standard
- [RFC 3447](https://tools.ietf.org/html/rfc3447) - RSA Cryptography
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key Management

---

**SecureTix** - Demonstrating the power of PKI for secure ticketing

// server.js - Backend DINHVIETTUNG (login plaintext, JWT, mssql)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// ====== DB CONFIG (.env) ======
// PORT=5000
// DB_USER=sa
// DB_PASSWORD=your_pass
// DB_SERVER=localhost
// DB_NAME=DINHVIETTUNG
// JWT_SECRET="something_long_and_random"
// JWT_EXPIRES_IN="1h"
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true, // local dev
    // encrypt: true, // Azure SQL
  },
};
const pool = new sql.ConnectionPool(dbConfig);

// ====== JWT helpers ======
function generateToken(user) {
  return jwt.sign(
    { userId: user.UserID, roleId: user.RoleID, username: user.Username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ message: 'Thiếu token (Unauthorized)' });

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn (Forbidden)' });
    req.user = payload;
    next();
  });
}

// ====== ROUTES ======
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'citizen-backend' });
});

// LOGIN: so sánh MẬT KHẨU THÔ (KHÔNG HASH)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Thiếu username/password' });
  }
  try {
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .query('SELECT UserID, Username, PasswordHash, FullName, RoleID FROM UserAccount WHERE Username = @username');

    if (!result.recordset.length) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }
    const user = result.recordset[0];

    // So sánh plaintext
    if (password !== user.PasswordHash) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: { fullName: user.FullName, roleId: user.RoleID, username: user.Username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
});

// ADD CITIZEN (usp_AddCitizenWithOptionalHead)
app.post('/api/citizens', authenticateToken, async (req, res) => {
  const {
    nationalId, fullName, dateOfBirth, gender,
    areaName, areaType, householdAddress,
    isHead = false, hasCriminalRecord = false,
    setWanted = false, setQuanChe = false
  } = req.body || {};

  if (!nationalId || !fullName || !areaName || !areaType || !householdAddress) {
    return res.status(400).json({ message: 'Thiếu trường bắt buộc' });
  }

  try {
    const result = await pool.request()
      .input('NationalID', sql.VarChar(12), nationalId)
      .input('FullName', sql.NVarChar(100), fullName)
      .input('DateOfBirth', sql.Date, dateOfBirth || null)
      .input('Gender', sql.NVarChar(10), gender || null)
      .input('AreaName', sql.NVarChar(100), areaName)
      .input('AreaType', sql.NVarChar(50), areaType)
      .input('HouseholdAddress', sql.NVarChar(255), householdAddress)
      .input('IsHead', sql.Bit, isHead ? 1 : 0)
      .input('HasCriminalRecord', sql.Bit, hasCriminalRecord ? 1 : 0)
      .input('SetWanted', sql.Bit, setWanted ? 1 : 0)
      .input('SetQuanChe', sql.Bit, setQuanChe ? 1 : 0)
      .execute('usp_AddCitizenWithOptionalHead');

    return res.status(201).json({
      message: 'Thêm công dân thành công',
      data: result.recordset?.[0] || null
    });
  } catch (err) {
    console.error('Add citizen error:', err);
    res.status(500).json({ message: 'Lỗi khi thêm công dân' });
  }
});

// SEARCH CITIZEN (usp_CitizenQuickSearch)
app.get('/api/citizens/:nationalId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('NationalID', sql.VarChar(12), req.params.nationalId)
      .execute('usp_CitizenQuickSearch');

    if (!result.recordset.length) {
      return res.status(404).json({ message: 'Không tìm thấy công dân' });
    }
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error('Search citizen error:', err);
    res.status(500).json({ message: 'Lỗi khi tra cứu công dân' });
  }
});

//DELETE CITIZEN (usp_DeleteCitizen)
// DELETE citizen by NationalID
app.delete('/api/citizens/:nationalId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.request()
      .input('NationalID', sql.VarChar(12), req.params.nationalId)
      .execute('usp_DeleteCitizenByNationalID');

    const row = result.recordset?.[0];
    if (!row || !row.Success) {
      // Trường hợp SP không trả recordset (hiếm)
      return res.json({ message: 'Đã xử lý xóa (nếu tồn tại)', success: true });
    }

    return res.json({
      message: 'Đã xóa công dân thành công',
      meta: row
    });
  } catch (err) {
    // Nếu SP RAISERROR 'Không tìm thấy ...' → map 404
    const msg = (err && err.message) ? err.message : 'Lỗi khi xóa công dân';
    if (msg.includes('Không tìm thấy')) {
      return res.status(404).json({ message: 'Không tìm thấy công dân với CCCD này.' });
    }
    console.error('Delete citizen error:', err);
    return res.status(500).json({ message: 'Lỗi server khi xóa công dân' });
  }
});


// ====== START ======
pool.connect()
  .then(() => {
    console.log('✅ Đã kết nối SQL Server');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Backend chạy http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối DB:', err);
    process.exit(1);
  });

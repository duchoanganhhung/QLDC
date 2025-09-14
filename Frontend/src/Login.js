import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert, Stack
} from '@mui/material';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');
      onLoginSuccess({ token: data.token, user: data.user });
    } catch (err) { setError(err.message); }
  };

  return (
    <Box sx={{ minHeight:'100vh', display:'grid', placeItems:'center', bgcolor:'#f6f7fb' }}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Đăng nhập</Typography>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label="Tên đăng nhập" value={username}
                         onChange={e=>setUsername(e.target.value)} required />
              <TextField label="Mật khẩu" type="password" value={password}
                         onChange={e=>setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" size="large">Đăng nhập</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

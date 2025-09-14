// src/AddCitizenForm.js
import React, { useState } from 'react';
import {
  Card, CardContent, Typography, Grid, TextField, MenuItem,
  FormControlLabel, Checkbox, Button, Alert, Stack, Box, FormGroup, FormLabel, Divider
} from '@mui/material';
import { apiPost } from './api';

export default function AddCitizenForm() {
  const [form, setForm] = useState({
    nationalId: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    areaName: '',
    areaType: '',
    householdAddress: '',
    isHead: false,
    hasCriminalRecord: false,
    setWanted: false,
    setQuanChe: false
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const change = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  // Khi bỏ "Có tiền án/tiền sự" -> tự tắt Truy nã / Quản chế
  const toggleHasCriminal = (e) => {
    const checked = e.target.checked;
    setForm(f => ({
      ...f,
      hasCriminalRecord: checked,
      setWanted: checked ? f.setWanted : false,
      setQuanChe: checked ? f.setQuanChe : false
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');

    // Không cho gửi nếu chọn Truy nã / Quản chế mà chưa bật "Có tiền án/tiền sự"
    if ((form.setWanted || form.setQuanChe) && !form.hasCriminalRecord) {
      setErr('Vui lòng tích "Có tiền án/tiền sự" trước khi chọn Truy nã hoặc Quản chế.');
      return;
    }

    try {
      const data = await apiPost('/api/citizens', form);
      setMsg(`Thêm thành công (CitizenID: ${data?.data?.CitizenID ?? 'N/A'})`);
      setForm({
        nationalId: '', fullName: '', dateOfBirth: '', gender: '',
        areaName: '', areaType: '', householdAddress: '',
        isHead: false, hasCriminalRecord: false, setWanted: false, setQuanChe: false
      });
    } catch (error) { setErr(error.message); }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Nhập thông tin</Typography>

        <form onSubmit={submit}>
          <Stack spacing={2}>
            {msg && <Alert severity="success">{msg}</Alert>}
            {err && <Alert severity="error">{err}</Alert>}

            {/* Hàng 1: CCCD | Họ tên */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="CCCD *"
                  name="nationalId"
                  value={form.nationalId}
                  inputProps={{ maxLength: 12 }}
                  onChange={change}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Họ tên *"
                  name="fullName"
                  value={form.fullName}
                  onChange={change}
                  required
                  fullWidth
                />
              </Grid>

              {/* Hàng 2: Ngày sinh | Giới tính */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Ngày sinh"
                  name="dateOfBirth"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.dateOfBirth}
                  onChange={change}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Giới tính"
                  name="gender"
                  value={form.gender}
                  onChange={change}
                  fullWidth
                >
                  <MenuItem value="">--Chọn--</MenuItem>
                  <MenuItem value="Nam">Nam</MenuItem>
                  <MenuItem value="Nữ">Nữ</MenuItem>
                  <MenuItem value="Khác">Khác</MenuItem>
                </TextField>
              </Grid>

              {/* Hàng 3: Khu vực | Loại khu vực */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Khu vực (Area Name) *"
                  name="areaName"
                  value={form.areaName}
                  onChange={change}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Loại khu vực (Area Type) *"
                  name="areaType"
                  value={form.areaType}
                  onChange={change}
                  required
                  fullWidth
                >
                  <MenuItem value="">--Chọn--</MenuItem>
                  <MenuItem value="Thôn">Thôn</MenuItem>
                  <MenuItem value="Tổ">Tổ</MenuItem>
                </TextField>
              </Grid>

              {/* Hàng 4: Địa chỉ hộ (full) */}
              <Grid item xs={12}>
                <TextField
                  label="Địa chỉ hộ *"
                  name="householdAddress"
                  value={form.householdAddress}
                  onChange={change}
                  required
                  fullWidth
                />
              </Grid>

              {/* Hàng 5: Chủ hộ | Tình trạng pháp lý (nhóm bao hàm) */}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox name="isHead" checked={form.isHead} onChange={change} />
                  }
                  label="Chủ hộ"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <FormLabel component="legend" sx={{ mb: 1 }}>
                    Tình trạng pháp lý
                  </FormLabel>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="hasCriminalRecord"
                          checked={form.hasCriminalRecord}
                          onChange={toggleHasCriminal}
                        />
                      }
                      label="Có tiền án/tiền sự"
                    />
                    <Divider sx={{ my: 1 }} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="setWanted"
                          checked={form.setWanted}
                          onChange={change}
                          disabled={!form.hasCriminalRecord}
                        />
                      }
                      label="Gắn Truy nã"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="setQuanChe"
                          checked={form.setQuanChe}
                          onChange={change}
                          disabled={!form.hasCriminalRecord}
                        />
                      }
                      label="Gắn Quản chế"
                    />
                  </FormGroup>
                </Box>
              </Grid>
            </Grid>

            <Button type="submit" variant="contained" size="large">
              Thêm công dân
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}

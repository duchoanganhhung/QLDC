import React, { useState } from 'react';
import {
  Card, CardContent, Typography, TextField, Button, Grid, Alert, Stack, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { apiGet, apiDelete } from './api';

export default function DeleteCitizen() {
  const [cccd, setCccd] = useState('');
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadPreview = async () => {
    setMsg(''); setErr(''); setPreview(null);
    if (!cccd) return;
    try { setPreview(await apiGet(`/api/citizens/${cccd}`)); }
    catch (e) { setErr(e.message); }
  };

  const doDelete = async () => {
    setConfirmOpen(false);
    try {
      const res = await apiDelete(`/api/citizens/${cccd}`);
      setMsg(res.message || 'Đã xóa công dân.');
      setPreview(null);
      setCccd('');
    } catch (e) { setErr(e.message); }
  };

  return (
    <Stack spacing={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={7}>
          <TextField fullWidth label="Nhập CCCD để xóa" value={cccd}
                     onChange={e=>setCccd(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button fullWidth variant="outlined" onClick={loadPreview}>Xem thông tin</Button>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button fullWidth color="error" variant="contained"
                  onClick={()=>setConfirmOpen(true)} disabled={!cccd}>
            Xóa
          </Button>
        </Grid>
      </Grid>

      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      {preview && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Thông tin sẽ bị xóa</Typography>
            <div><b>Họ tên:</b> {preview.FullName}</div>
            <div><b>CCCD:</b> {preview.NationalID}</div>
            <div><b>Ngày sinh:</b> {preview.DateOfBirth ? String(preview.DateOfBirth).substring(0,10) : ''}</div>
            <div><b>Giới tính:</b> {preview.Gender}</div>
            <div><b>Địa chỉ hộ:</b> {preview.HouseholdAddress}</div>
            <div><b>Khu vực:</b> {preview.AreaType} {preview.AreaName}</div>
            <div><b>Chủ hộ:</b> {preview.IsHeadOfHousehold ? 'Có' : 'Không'}</div>
            <div><b>Trạng thái hiệu lực:</b> {preview.AllActiveStatuses || 'Không'}</div>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onClose={()=>setConfirmOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn xóa công dân có CCCD <b>{cccd}</b>? Hành động không thể hoàn tác.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirmOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Xóa</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

import React, { useState } from 'react';
import {
  Card, CardContent, Typography, TextField, Button, Grid, Alert, Stack
} from '@mui/material';
import { apiGet } from './api';

export default function SearchCitizen() {
  const [cccd, setCccd] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const search = async () => {
    setErr(''); setData(null);
    if (!cccd) return;
    try {
      const res = await apiGet(`/api/citizens/${cccd}`);
      setData(res);
    } catch (e) { setErr(e.message); }
  };

  return (
    <Stack spacing={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={8}>
          <TextField fullWidth label="Nhập CCCD" value={cccd}
                     onChange={e=>setCccd(e.target.value)} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button fullWidth variant="contained" onClick={search}>Tra cứu</Button>
        </Grid>
      </Grid>

      {err && <Alert severity="error">{err}</Alert>}

      {data && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Thông tin công dân</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12}><b>Họ tên:</b> {data.FullName}</Grid>
              <Grid item xs={12}><b>CCCD:</b> {data.NationalID}</Grid>
              <Grid item xs={12}><b>Ngày sinh:</b> {data.DateOfBirth ? String(data.DateOfBirth).substring(0,10) : ''}</Grid>
              <Grid item xs={12}><b>Giới tính:</b> {data.Gender}</Grid>
              <Grid item xs={12}><b>Địa chỉ hộ:</b> {data.HouseholdAddress}</Grid>
              <Grid item xs={12}><b>Khu vực:</b> {data.AreaType} {data.AreaName}</Grid>
              <Grid item xs={12}><b>Chủ hộ:</b> {data.IsHeadOfHousehold ? 'Có' : 'Không'}</Grid>
              <Grid item xs={12}><b>Trạng thái hiệu lực:</b> {data.AllActiveStatuses || 'Không'}</Grid>
              {data.AlertText && <Grid item xs={12}><b style={{color:'#dc2626'}}>Cảnh báo:</b> {data.AlertText}</Grid>}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

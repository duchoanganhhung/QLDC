import React, { useEffect, useState } from 'react';
import Login from './Login';
import AddCitizenForm from './AddCitizenForm';
import SearchCitizen from './SearchCitizen';
import DeleteCitizen from './DeleteCitizen';
import { getToken, setToken, apiGet, getUserStorage, setUserStorage } from './api';

import {
  AppBar, Toolbar, Typography, Container, Tabs, Tab, Box, Button
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/Search';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

function TabPanel({ value, index, children }) {
  return <div hidden={value!==index}>{value===index && <Box sx={{ mt:2 }}>{children}</Box>}</div>;
}

export default function App(){
  const [user, setUser] = useState(getUserStorage());
  const [tab, setTab] = useState(0);
  const token = getToken();

  useEffect(() => { (async () => { try { await apiGet('/api/health'); } catch {} })(); }, []);

  const handleLoginSuccess = ({ token, user }) => {
    setToken(token);
    setUser(user);
    setUserStorage(user);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUserStorage(null);
  };

  if (!token || !user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{flexGrow:1}}>Hệ thống Quản lý Công dân</Typography>
          <Typography sx={{mr:2}}>Xin chào, <b>{user.fullName}</b></Typography>
          <Button color="inherit" onClick={handleLogout}>Đăng xuất</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt:3, mb:4 }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} centered>
          <Tab icon={<PersonAddAlt1Icon/>} iconPosition="start" label="Thêm công dân" />
          <Tab icon={<SearchIcon/>} iconPosition="start" label="Tra cứu công dân" />
          <Tab icon={<DeleteOutlineIcon/>} iconPosition="start" label="Xóa công dân" />
        </Tabs>

        <TabPanel value={tab} index={0}><AddCitizenForm/></TabPanel>
        <TabPanel value={tab} index={1}><SearchCitizen/></TabPanel>
        <TabPanel value={tab} index={2}><DeleteCitizen/></TabPanel>
      </Container>
    </>
  );
}

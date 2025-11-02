// src/navigation/DrawerNavigator.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ProfileScreen from '../screens/ProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import FriendsScreen from '../screens/FriendsScreen';
import SongsGlobalScreen from '../screens/SongsGlobalScreen';
import { useAuth } from '../context/AuthContext';  // << เพิ่มบรรทัดนี้

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { user, profileDoc } = useAuth(); // << อ่านจาก context
  const isJed =
    (user?.displayName?.toLowerCase?.() === 'jed') ||
    (profileDoc?.displayName?.toLowerCase?.() === 'jed');

  return (
    <Drawer.Navigator initialRouteName="Profile" screenOptions={{ headerShown: true }}>
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Change password" component={ChangePasswordScreen} />
      {isJed && (
        <Drawer.Screen name="songs" component={SongsGlobalScreen} />
      )}
    </Drawer.Navigator>
  );
}

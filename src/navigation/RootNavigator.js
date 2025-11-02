// src/navigation/RootNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgetPasswordScreen from '../screens/ForgetPasswordScreen';
import MainScreen from '../screens/MainScreen';
import ProfileScreen from '../screens/ProfileScreen';       // << เพิ่ม
import SongsGlobalScreen from '../screens/SongsGlobalScreen';
import SearchScreen from '../screens/SearchScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: true, title: 'Search' }}
/>
      <Stack.Screen
        name="ForgetPassword"
        component={ForgetPasswordScreen}
        options={{ headerShown: true, title: 'Forget Password' }}
      />

      {/* Main เป็นหน้าฟีดเพลง (ซ่อน header) */}
      <Stack.Screen name="Main" component={MainScreen} />

      {/* Profile เป็นหน้าแยก (โชว์ header เพื่อใช้ Hamburger/เมนู) */}
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Profile' }}
      />

      <Stack.Screen
        name="SongsGlobal"
        component={SongsGlobalScreen}
        options={{ headerShown: true, title: 'Songs (Global)' }}
      />
    </Stack.Navigator>
  );
}

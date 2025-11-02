// src/navigation/RootNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgetPasswordScreen from '../screens/ForgetPasswordScreen';

import MainScreen from '../screens/MainScreen';
import ProfileScreen from '../screens/ProfileScreen';

import SearchScreen from '../screens/SearchScreen';
import SlipCheckScreen from '../screens/SlipCheckScreen';
import SongsGlobalScreen from '../screens/SongsGlobalScreen'; // ถ้าไม่มีให้ลบออก

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{ headerShown: false, unmountOnBlur: true }}  // << สำคัญ
      />
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Profile', unmountOnBlur: true }} // << สำคัญ
      />

      <Stack.Screen name="SearchScreen" component={SearchScreen} options={{ headerShown: true, title: 'Search' }} />
      <Stack.Screen name="SlipCheck" component={SlipCheckScreen} options={{ headerShown: true, title: 'Confirm Payment' }} />
      <Stack.Screen name="ForgetPassword" component={ForgetPasswordScreen} options={{ headerShown: true, title: 'Change Password' }} />

      {/* ถ้าใช้สิทธิ์เฉพาะ jed */}
      <Stack.Screen name="SongsGlobal" component={SongsGlobalScreen} options={{ headerShown: true, title: 'Songs Global' }} />
    </Stack.Navigator>
  );
}

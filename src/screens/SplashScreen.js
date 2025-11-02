// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen({ navigation }) {
  const { user } = useAuth(); // undefined: กำลังโหลด, null: ยังไม่ล็อกอิน, object: ล็อกอินแล้ว

  useEffect(() => {
    // แสดง Splash สั้น ๆ ให้สวย (ปรับเวลาได้ตามชอบ)
    const t = setTimeout(() => {
      if (typeof user === 'undefined') return; // รอให้ Auth ตัดสินใจก่อน
      if (user) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }, 700);
    return () => clearTimeout(t);
  }, [user, navigation]);

  return (
    <View style={styles.container}>
      {/* ใส่โลโก้โปรเจ็กต์ของคุณแทนภาพตัวอย่าง */}
      <Image
        source={{ uri: 'https://i.imgur.com/7QdY7Yp.png' }}
        style={{ width: 96, height: 96, marginBottom: 16, borderRadius: 20 }}
      />
      <Text style={styles.title}>Loading…</Text>
      <ActivityIndicator size="large" color="#111" style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
});

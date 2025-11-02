// src/screens/LoginScreen.js
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Animated, Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔹 ค่าอนิเมชันสำหรับซูมอิน/เฟดเอาต์
  const scale = useRef(new Animated.Value(1)).current;
  const fade  = useRef(new Animated.Value(1)).current;

  const playZoomAndGo = async () => {
    // เล่นอนิเมชัน แล้วค่อยนำทาง (รอให้จบก่อน)
    await new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const onLogin = async () => {
    const em = email.trim();
    if (!em || !password) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรอกอีเมลและรหัสผ่านให้ครบ');
    }
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, em, password);
      await playZoomAndGo(); // ✅ ซูมอินก่อนพาไป Main
    } catch (e) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ครอบการ์ดด้วย Animated.View เพื่อให้ซูมทั้งบล็อก */}
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity: fade }]}>
          <Text style={styles.title}>Login</Text>

          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 8 }]}>Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={onLogin}
          />

          {/* ลิงก์ Forgot Password ชิดขวา */}
          <View style={styles.linksRowRight}>
            <TouchableOpacity onPress={() => navigation.navigate('ForgetPassword')}>
              <Text style={styles.link}>Forgot Password ?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Login</Text>}
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.muted}>ยังไม่มีรหัส? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>สมัครผู้ใช้ใหม่</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsText}>
            จัดทำขึ้นเพื่อการศึกษาในรายภาควิชา Mobile Application Development
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#0edd6bff';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  title: {
    fontSize: 28, fontWeight: '800', color: PRIMARY, textAlign: 'center', marginBottom: 16,
  },
  label: { color: '#374151', fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', color: '#111827',
  },
  linksRowRight: { alignItems: 'flex-end', marginTop: 10 },
  btn: {
    backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 16,
  },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  muted: { color: '#6b7280' },
  signupLink: { color: PRIMARY, fontWeight: '700' },

  link: { color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline' },
  termsText: { color: '#6b7280', textAlign: 'center', fontSize: 12, marginTop: 14, lineHeight: 18 },
});

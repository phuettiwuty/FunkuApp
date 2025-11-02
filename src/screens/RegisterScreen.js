// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Linking, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const PRIMARY = 'hsla(140, 94%, 52%, 1.00)';

export default function RegisterScreen() {
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    const name = displayName.trim();
    const em = email.trim();
    const pw = password;

    if (!name || !em || !pw) {
      return Alert.alert('ข้อมูลไม่ครบ', 'กรอกชื่อ อีเมล และรหัสผ่านให้ครบ');
    }
    if (pw.length < 6) {
      return Alert.alert('รหัสสั้นเกินไป', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    }

    try {
      setLoading(true);

      // 1) สมัครผู้ใช้
      const cred = await createUserWithEmailAndPassword(auth, em, pw);

      // 2) ตั้งชื่อ/รูปใน Firebase Auth
      await updateProfile(cred.user, {
        displayName: name,
        photoURL: photoURL || null,
      });

      // 3) บันทึกเอกสารผู้ใช้ใน Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name,
        photoURL: photoURL || null,
        email: em,
        premium: false,                // ค่าเริ่มต้นยังไม่พรีเมียม
        createdAt: serverTimestamp(),
      });

      // 4) ไปหน้า Main และล้าง stack
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      Alert.alert('สมัครไม่สำเร็จ', String(e?.message || e));
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
        <View style={styles.card}>
          <Text style={styles.title}>Sign up</Text>

          <Text style={styles.label}>Display name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#9ca3af"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 8 }]}>Photo URL (optional):</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            value={photoURL}
            onChangeText={setPhotoURL}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 8 }]}>Email:</Text>
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
            placeholder="อย่างน้อย 6 ตัวอักษร"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={onRegister}
          />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>สร้างบัญชี</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.muted}>มีบัญชีอยู่แล้ว? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // layout ให้เข้ากับหน้า Login
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

  btn: {
    backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 16,
  },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  muted: { color: '#6b7280' },
  loginLink: { color: PRIMARY, fontWeight: '700' },

  link: { color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline' },
  termsText: { color: '#6b7280', textAlign: 'center', fontSize: 12, marginTop: 14, lineHeight: 18 },
});

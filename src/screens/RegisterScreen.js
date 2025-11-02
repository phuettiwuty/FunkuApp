// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase/config'; // <-- เปลี่ยน path ให้ตรงโปรเจกต์
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function RegisterScreen() {
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    const em = email.trim();
    const pw = password;
    const name = displayName.trim();

    if (!name || !em || !pw) return Alert.alert('ข้อมูลไม่ครบ', 'กรอกชื่อ อีเมล และรหัสผ่าน');

    try {
      setLoading(true);

      // สมัครผู้ใช้
      const cred = await createUserWithEmailAndPassword(auth, em, pw);

      // ตั้งค่าโปรไฟล์ใน Firebase Auth
      await updateProfile(cred.user, {
        displayName: name,
        photoURL: photoURL || null,
      });

      // สร้างเอกสาร users/{uid} (สำคัญ: เพื่อให้ ProfileScreen อัปเดตได้)
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: name,
        photoURL: photoURL || null,
        email: em,
        createdAt: serverTimestamp(),
      });

      // ไปหน้า Main ทันที
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
      <View style={styles.card}>
        <Text style={styles.title}>Register</Text>

        <TextInput
          style={styles.input}
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <TextInput
          style={styles.input}
          placeholder="Photo URL (optional)"
          autoCapitalize="none"
          value={photoURL}
          onChangeText={setPhotoURL}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (>= 6 ตัว)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={onRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>สมัครสมาชิก</Text>}
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, elevation: 4 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  link: { color: '#2563eb', fontWeight: '600' },
});

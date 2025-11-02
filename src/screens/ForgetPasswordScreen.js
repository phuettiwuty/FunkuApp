// src/screens/ForgetPasswordScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';

const PRIMARY = '#0edd6bff'; // ให้ตรงกับหน้า Login

export default function ForgetPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onReset = async () => {
    const em = email.trim();
    if (!em) return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกอีเมล');
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, em);
      Alert.alert('สำเร็จ', 'ระบบได้ส่งลิงก์สำหรับเปลี่ยนรหัสไปยังอีเมลแล้ว');
      setEmail('');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('ไม่สำเร็จ', String(e?.message || e));
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
          <Text style={styles.title}>Forgot password</Text>

          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            returnKeyType="send"
            onSubmitEditing={onReset}
          />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onReset}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send reset link</Text>}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.muted}>นึกออกรหัสแล้ว? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>กลับไปเข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            เราจะส่งอีเมลพร้อมลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังที่อยู่อีเมลของคุณ
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // layout ให้เข้ากับ Login/Register
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
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  muted: { color: '#6b7280' },
  link: { color: PRIMARY, fontWeight: '700' },
  note: { color: '#6b7280', textAlign: 'center', fontSize: 12, marginTop: 12, lineHeight: 18 },
});

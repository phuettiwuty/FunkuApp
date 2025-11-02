import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity,View } from 'react-native';
import CustomInput from '../components/CustomInput';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';


export default function ForgetPasswordScreen() {
  const [email, setEmail] = useState('');

  const onReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Success', 'ระบบได้ส่งลิงก์สำหรับเปลี่ยนรหัสไปยังอีเมลแล้ว');
      setEmail('');
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  return (
    <View style={{flex:4,backgroundColor: '#EEFCDC'}}>
      <View style={{flex:1}}></View>
    <View style={styles.container}>
      <CustomInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Recover</Text>
      </TouchableOpacity>
    </View>
      <View style={{flex:2}}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center',backgroundColor: 'white'},
  button: { backgroundColor: 'gray', paddingVertical: 12, borderRadius: 80, marginTop: 8 },
  buttonText: { color: 'Black', fontSize: 20, textAlign: 'center', fontWeight: '600' },
});

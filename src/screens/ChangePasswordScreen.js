import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomInput from '../components/CustomInput';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase/config';



export default function ChangePasswordScreen() {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secureOld, setSecureOld] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureCfm, setSecureCfm] = useState(true);

  const onChangePassword = async () => {
    if (newPass !== confirm) {
      Alert.alert('Error', 'รหัสใหม่และยืนยันรหัสไม่ตรงกัน');
      return;
    }
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, oldPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      Alert.alert('Success', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setOldPass(''); setNewPass(''); setConfirm('');
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  return (
    <View style={{flex:9,backgroundColor: '#EEFCDC'}}>
    <View style={{flex:3}}></View>
    <View style={[styles.container, {  }]}>
      <View style={{ marginTop: 24 }} />
      <CustomInput value={oldPass} onChangeText={setOldPass} placeholder="old password"
        secureTextEntry={secureOld} rightIconName={secureOld ? 'eye-off' : 'eye'} onIconPress={() => setSecureOld(s=>!s)} />
      <CustomInput value={newPass} onChangeText={setNewPass} placeholder="new password"
        secureTextEntry={secureNew} rightIconName={secureNew ? 'eye-off' : 'eye'} onIconPress={() => setSecureNew(s=>!s)} />
      <CustomInput value={confirm} onChangeText={setConfirm} placeholder="confirm new password"
        secureTextEntry={secureCfm} rightIconName={secureCfm ? 'eye-off' : 'eye'} onIconPress={() => setSecureCfm(s=>!s)} />

      <TouchableOpacity style={styles.button} onPress={onChangePassword}>
        <Text style={styles.buttonText}>Change password</Text>
      </TouchableOpacity>
    </View>
    <View style={{flex:3}}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 3, padding: 16 , backgroundColor:'white'},
  button: { backgroundColor: 'gray', paddingVertical: 12, borderRadius: 80, marginTop: 8 },
  buttonText: { color: 'black', fontSize: 20, textAlign: 'center', fontWeight: '600' },
});

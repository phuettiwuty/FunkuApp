// src/screens/SlipCheckScreen.js
import React, { useState } from 'react';
import {
  View, Text, Button, StyleSheet, Image, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../firebase/config';
import { doc, serverTimestamp, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { emit } from '../utils/eventBus';


const API_URL = 'https://api.slipok.com/api/line/apikey/55496';
const AUTH_TOKEN = 'SLIPOK6JT9BS3';
const TARGET_RECEIVER = 'ด.ช. พฤฒิวุฒิ ยุทธชนะ';
const MIN_PRICE_THB = 35; 

export default function SlipCheckScreen() {
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

 
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'จำเป็นต้องได้รับอนุญาตเข้าถึงคลังรูปภาพเพื่อเลือกสลิป');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const parseAmount = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/[^\d.]/g, ''));
      return isNaN(n) ? 0 : n;
    }
    return 0;
  };

  const handleSubmit = async () => {
    try {
      if (!imageUri) {
        Alert.alert('แจ้งเตือน', 'กรุณาเลือกรูปภาพสลิปก่อน');
        return;
      }
      setLoading(true);

      const formData = new FormData();
      const fileName = imageUri.split('/').pop() || 'slip.jpg';
      const isPng = fileName.toLowerCase().endsWith('.png');
      formData.append('files', {
        uri: imageUri,
        name: fileName,
        type: isPng ? 'image/png' : 'image/jpeg',
      });

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'x-authorization': AUTH_TOKEN },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'ตรวจสลิปล้มเหลว');

      const slipData = json?.data;
      const apiSuccess = slipData?.success === true;
      const receiverName = (slipData?.receiver?.displayName || '').trim();
      const amountNum = parseAmount(slipData?.amount);
      const currency = (slipData?.currency || 'THB').toUpperCase();

      const amountLabel = slipData?.amount ? `${amountNum} บาท` : 'ไม่ระบุ';
      const detail =
        `จำนวนเงิน: ${amountLabel}\n` +
        `คนโอนเงิน: ${(slipData?.sender?.displayName || '').trim() || '-'}\n` +
        `ผู้รับเงิน: ${receiverName || '-'}\n` +
        `วันที่/เวลา: ${slipData?.transDate || '-'} / ${slipData?.transTime || '-'}`;

      // ✅ ตรวจความถูกต้องจาก API
      if (!apiSuccess) {
        Alert.alert('❌ ตรวจสอบสลิปไม่ผ่าน', detail);
        return;
      }
      // ✅ ชื่อผู้รับต้องตรง
      if (receiverName !== TARGET_RECEIVER) {
        Alert.alert('❌ ชื่อผู้รับไม่ตรง', `${detail}\n\nต้องโอนเข้า: ${TARGET_RECEIVER}`);
        return;
      }
      // ✅ สกุลเงินต้องเป็น THB (กันสลิปข้ามสกุล)
      if (currency !== 'THB') {
        Alert.alert('❌ สกุลเงินไม่รองรับ', `${detail}\n\nสกุลเงินที่รองรับ: THB`);
        return;
      }
      // ✅ ขั้นต่ำ 35 บาท
      if (amountNum < MIN_PRICE_THB) {
        Alert.alert('❌ จำนวนเงินไม่ถึงขั้นต่ำ', `${detail}\n\nต้องชำระอย่างน้อย ${MIN_PRICE_THB} บาท`);
        return;
      }

      // ผ่านทุกเงื่อนไข → อัปเดต premium
      const u = auth.currentUser;
      if (!u?.uid) {
        Alert.alert('ยังไม่ได้ล็อกอิน', 'โปรดเข้าสู่ระบบก่อน');
        return;
      }

      const userRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userRef);
      const updateData = {
        premium: true,
        premiumActivatedAt: serverTimestamp(),
        lastPaymentSlipAt: serverTimestamp(),
        lastPaymentAmountTHB: amountNum,  // ✅ บันทึกจำนวนเงิน
        paymentProvider: 'slipok',
      };

      if (snap.exists()) {
        await updateDoc(userRef, updateData);
      } else {
        await setDoc(userRef, {
          email: u.email || null,
          displayName: u.displayName || null,
          photoURL: u.photoURL || null,
          createdAt: serverTimestamp(),
          ...updateData,
        });
      }

      Alert.alert('✅ สลิปถูกต้อง', `ปลดล็อกฟังเพลงเต็มทุกเพลงแล้ว!\n(ชำระ ${amountNum} บาท)`, [
        {
          text: 'OK',
          onPress: () => {
            emit('PREMIUM_UPGRADED');
            navigation.goBack();
          },
        },
      ]);
    } catch (e) {
      Alert.alert('🚨 ข้อผิดพลาด', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>ยืนยันการชำระเงิน</Text>
        <Text style={styles.sub}>ชื่อเจ้าของบัญชี: {TARGET_RECEIVER}</Text>
        <Text style={styles.subMin}>ขั้นต่ำในการสมัครสมาชิก: {MIN_PRICE_THB} บาท</Text>

        <TouchableOpacity style={styles.pickBtn} onPress={handlePickImage}>
          <Text style={styles.pickText}>{imageUri ? 'เลือกสลิปใหม่' : 'เลือกภาพสลิปจากเครื่อง'}</Text>
        </TouchableOpacity>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

        <View style={styles.checkBox}>
          <Button
            title={loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสลิปนี้'}
            onPress={handleSubmit}
            disabled={!imageUri || loading}
            color="#111827"
          />
        </View>

        {loading && <ActivityIndicator size="large" color="#111827" style={{ marginTop: 12 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7fb' },
  scroll: { padding: 16 },
  header: { fontSize: 20, fontWeight: '800', marginBottom: 4, color: '#111' },
  sub: { color: '#6b7280', marginBottom: 4 },
  subMin: { color: '#374151', marginBottom: 12, fontWeight: '700' },
  pickBtn: { backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  pickText: { color: '#fff', fontWeight: '700' },
  preview: {
    width: '100%', height: 420, resizeMode: 'contain',
    marginVertical: 14, backgroundColor: '#fff', borderRadius: 8
  },
  checkBox: { marginTop: 4 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomInput from '../components/CustomInput';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase/config';
import {
  addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where, getDocs
} from 'firebase/firestore';
import { Card } from 'react-native-paper';

const BG_COLOR = '#EEFCDC';

export default function FriendsScreen() {
  const [email, setEmail] = useState('');
  const [friends, setFriends] = useState([]);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, 'users', uid, 'friends');
    const q = query(ref);
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // จัดเรียงตามชื่อให้ดูสวยขึ้น
      list.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
      setFriends(list);
    });
    return () => unsub();
  }, [uid]);

  const addFriendByEmail = async () => {
    const myUid = uid;
    if (!myUid) return;
    if (!email.trim()) return;

    try {
      // หา user เป้าหมายจาก email
      const usersQ = query(collection(db, 'users'), where('email', '==', email.trim()));
      const snap = await getDocs(usersQ);
      if (snap.empty) {
        Alert.alert('Not found', 'ไม่พบผู้ใช้ตามอีเมลนี้ในระบบ');
        return;
      }
      const target = { id: snap.docs[0].id, ...snap.docs[0].data() };

      // เขียนข้อมูลเพื่อนแบบ denormalized เพื่อแสดงผลง่ายใน FlatList
      const friendRef = doc(collection(db, 'users', myUid, 'friends'));
      await setDoc(friendRef, {
        friendUid: target.id,
        displayName: target.displayName || '',
        email: target.email || '',
        photoURL: target.photoURL || null,
        // studentId: target.studentId || '-',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', `เพิ่มเพื่อน ${target.displayName || target.email} แล้ว`);
      setEmail('');
    } catch (e) {
      Alert.alert('Failed', e.message);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Image source={{ uri: item.photoURL || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.displayName || '-'}</Text>
          <Text style={styles.email}>{item.email}</Text>
          {/* <Text style={styles.sid}>Student ID: {item.studentId || '-'}</Text> */}
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG_COLOR }]}>
      <View style={styles.addRow}>
        <CustomInput
          value={email}
          onChangeText={setEmail}
          placeholder="เพิ่มเพื่อนด้วยอีเมล"
          keyboardType="email-address"
          rightIconName="add-circle"
          onIconPress={addFriendByEmail}
        />
      </View>

      {friends.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="sad-outline" size={64} />
          <Text style={{ marginTop: 8 }}>ยังไม่มีเพื่อนในระบบ</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addRow: { marginTop: 8 },
  card: { marginVertical: 8, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, marginTop: 2 },
  sid: { fontSize: 14, marginTop: 2, fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
